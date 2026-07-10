-- Use allowed wallet_transactions.type values
CREATE OR REPLACE FUNCTION public.create_payment_hold_with_split(p_booking_id uuid, p_booking_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_provider_id uuid; v_user_id uuid; v_total numeric;
  v_provider_earnings numeric; v_platform_commission numeric; v_vat numeric;
  v_immediate_pct integer; v_hold_hours integer;
  v_available numeric; v_held numeric;
  v_event_end timestamptz; v_hold_until timestamptz;
  v_hold_id uuid; v_existing_hold uuid;
  v_source_type text; v_booking_table text;
BEGIN
  SELECT id INTO v_existing_hold FROM public.payment_holds WHERE source_id=p_booking_id LIMIT 1;
  IF v_existing_hold IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'hold_id',v_existing_hold,'skipped',true); END IF;

  v_immediate_pct := COALESCE((SELECT (value)::text::integer FROM public.system_settings WHERE key='wallet_split_immediate_percent'),70);
  v_hold_hours := COALESCE((SELECT (value)::text::integer FROM public.system_settings WHERE key='payment_hold_hours'),72);

  IF p_booking_type='service' THEN
    v_booking_table:='service_bookings'; v_source_type:='service_booking';
    SELECT sb.user_id,sb.provider_id,sb.total_amount,sb.provider_earnings,sb.platform_commission,sb.vat_amount,
           CASE WHEN sb.service_date IS NOT NULL AND sb.end_time IS NOT NULL
                THEN (substring(sb.service_date from 1 for 10)||' '||sb.end_time)::timestamptz ELSE now() END
      INTO v_user_id,v_provider_id,v_total,v_provider_earnings,v_platform_commission,v_vat,v_event_end
    FROM public.service_bookings sb WHERE sb.id=p_booking_id;
  ELSE
    v_booking_table:='bookings'; v_source_type:='event_booking';
    SELECT b.user_id,e.organizer_id,b.total_amount,b.provider_earnings,b.platform_commission,
           COALESCE(b.vat_on_commission,b.vat_amount), e.end_date
      INTO v_user_id,v_provider_id,v_total,v_provider_earnings,v_platform_commission,v_vat,v_event_end
    FROM public.bookings b JOIN public.events e ON e.id=b.event_id WHERE b.id=p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','booking_or_provider_not_found'); END IF;

  v_provider_earnings:=COALESCE(v_provider_earnings,0);
  v_platform_commission:=COALESCE(v_platform_commission,0);
  v_vat:=COALESCE(v_vat,0);
  v_available:=ROUND((v_provider_earnings*v_immediate_pct/100.0)::numeric,2);
  v_held:=ROUND((v_provider_earnings-v_available)::numeric,2);
  v_hold_until:=GREATEST(now(),COALESCE(v_event_end,now()))+(v_hold_hours||' hours')::interval;

  INSERT INTO public.payment_holds (
    source_type,source_id,provider_id,payer_id,gross_amount,platform_fee,vat_amount,net_amount,
    available_amount,held_amount,currency,status,event_end_at,hold_until,
    complaint_extension,booking_table,auto_split_percent
  ) VALUES (
    v_source_type::payment_hold_source, p_booking_id, v_provider_id, v_user_id,
    v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_available, v_held, 'SAR', 'held'::payment_hold_status, v_event_end, v_hold_until,
    false, v_booking_table, v_immediate_pct
  ) RETURNING id INTO v_hold_id;

  INSERT INTO public.user_wallets (user_id,balance,total_earned,held_balance)
  VALUES (v_provider_id,v_available,v_available,v_held)
  ON CONFLICT (user_id) DO UPDATE
    SET balance=public.user_wallets.balance+EXCLUDED.balance,
        total_earned=public.user_wallets.total_earned+EXCLUDED.balance,
        held_balance=public.user_wallets.held_balance+EXCLUDED.held_balance,
        updated_at=now();

  IF v_available>0 THEN
    INSERT INTO public.wallet_transactions (user_id,type,amount,description,status,reference_id,reference_type)
    VALUES (v_provider_id,'credit',v_available,
      'إيرادات فورية (70%) من حجز #'||substring(p_booking_id::text,1,8),
      'completed', p_booking_id, v_source_type);
  END IF;

  INSERT INTO public.financial_transaction_logs
    (transaction_type,amount,status,reference_type,reference_id,payer_id,receiver_id,metadata)
  VALUES ('hold_created',v_provider_earnings,'completed','payment_hold',v_hold_id,v_user_id,v_provider_id,
    jsonb_build_object('booking_id',p_booking_id,'available',v_available,'held',v_held));

  RETURN jsonb_build_object('ok',true,'hold_id',v_hold_id,'available',v_available,'held',v_held);
END; $function$;

-- Patch confirm_paid_booking: payment->debit
CREATE OR REPLACE FUNCTION public.confirm_paid_booking(
  p_booking_id uuid, p_booking_type text, p_payment_id text, p_provider_amount_halalas integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user_id uuid; v_total numeric; v_status text; v_event_id uuid; v_quantity int;
  v_provider_id uuid; v_expected_halalas int; v_hold_res jsonb; v_inv_res jsonb;
  v_points int; v_points_used int := 0; v_ref_type text;
BEGIN
  IF p_booking_id IS NULL OR p_booking_type IS NULL OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','missing_params'); END IF;
  v_ref_type := CASE WHEN p_booking_type='service' THEN 'service_booking' ELSE 'event_booking' END;

  IF p_booking_type='service' THEN
    SELECT user_id,total_amount,status,provider_id,COALESCE(quantity,1)
      INTO v_user_id,v_total,v_status,v_provider_id,v_quantity
    FROM public.service_bookings WHERE id=p_booking_id FOR UPDATE;
  ELSE
    SELECT user_id,total_amount,status,COALESCE(quantity,1),event_id,COALESCE(points_used,0)
      INTO v_user_id,v_total,v_status,v_quantity,v_event_id,v_points_used
    FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
    IF v_event_id IS NOT NULL THEN
      SELECT organizer_id INTO v_provider_id FROM public.events WHERE id=v_event_id;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','booking_not_found'); END IF;
  IF v_status='confirmed' THEN RETURN jsonb_build_object('ok',true,'already_confirmed',true); END IF;

  IF p_provider_amount_halalas IS NOT NULL THEN
    v_expected_halalas := ROUND(v_total * 100)::int;
    IF abs(v_expected_halalas - p_provider_amount_halalas) > 1 THEN
      INSERT INTO public.financial_transaction_logs
        (transaction_type,amount,status,reference_type,reference_id,payer_id,metadata)
      VALUES ('booking_payment',v_total,'failed',v_ref_type,p_booking_id,v_user_id,
        jsonb_build_object('error','amount_mismatch','expected',v_expected_halalas,'received',p_provider_amount_halalas));
      RETURN jsonb_build_object('ok',false,'error','amount_mismatch');
    END IF;
  END IF;

  UPDATE public.payments SET status='completed',completed_at=now() WHERE provider_payment_id=p_payment_id;

  IF p_booking_type='service' THEN
    UPDATE public.service_bookings SET status='confirmed',payment_id=p_payment_id,updated_at=now()
     WHERE id=p_booking_id AND status<>'confirmed';
  ELSE
    UPDATE public.bookings SET status='confirmed',payment_id=p_payment_id,updated_at=now()
     WHERE id=p_booking_id AND status<>'confirmed';
  END IF;

  v_hold_res := public.create_payment_hold_with_split(p_booking_id,p_booking_type);
  IF (v_hold_res->>'ok')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'create_payment_hold_with_split failed: %', v_hold_res::text;
  END IF;

  BEGIN v_inv_res := public.generate_booking_invoices(p_booking_id,p_booking_type);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs(level,message,details,user_id)
    VALUES ('error','generate_booking_invoices failed',jsonb_build_object('booking_id',p_booking_id,'err',SQLERRM),v_user_id);
  END;

  INSERT INTO public.wallet_transactions (user_id,type,amount,description,status,reference_id,reference_type)
  VALUES (v_user_id,'debit',v_total,
    CASE WHEN p_booking_type='event' THEN 'دفع حجز فعالية #' ELSE 'دفع حجز خدمة #' END||substring(p_booking_id::text,1,8),
    'completed', p_booking_id, v_ref_type);

  IF p_booking_type='event' AND v_event_id IS NOT NULL AND v_quantity>0
     AND NOT EXISTS (SELECT 1 FROM public.tickets WHERE booking_id=p_booking_id LIMIT 1) THEN
    INSERT INTO public.tickets (booking_id,ticket_number,qr_code,holder_name,status)
    SELECT p_booking_id, substring(p_booking_id::text,1,8)||'-'||gs::text,
           p_booking_id::text||'-'||gs::text||'-'||extract(epoch from now())::bigint::text,'Guest','active'
    FROM generate_series(1,v_quantity) gs;
  END IF;

  v_points := floor(v_total*0.01);
  IF v_points>0 AND NOT EXISTS (
    SELECT 1 FROM public.loyalty_ledger WHERE reference_id=p_booking_id AND reference_type=v_ref_type AND type='earned'
  ) THEN
    INSERT INTO public.loyalty_ledger (user_id,points,type,description,reference_id,reference_type)
    VALUES (v_user_id,v_points,'earned','نقاط من حجز',p_booking_id,v_ref_type);
  END IF;

  INSERT INTO public.financial_transaction_logs
    (transaction_type,amount,status,reference_type,reference_id,payer_id,receiver_id,service_type,metadata)
  VALUES ('booking_payment',v_total,'completed',v_ref_type,p_booking_id,v_user_id,v_provider_id,p_booking_type,
    jsonb_build_object('payment_id',p_payment_id));

  INSERT INTO public.notifications (user_id,type,title,message,data)
  VALUES (v_user_id,'payment_success','تم الدفع بنجاح','تم استلام دفعتك بقيمة '||v_total||' ريال',
    jsonb_build_object('booking_id',p_booking_id,'amount',v_total));

  IF v_provider_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id,type,title,message,data)
    VALUES (v_provider_id,'new_booking_received','حجز جديد','حجز جديد بقيمة '||v_total,
      jsonb_build_object('booking_id',p_booking_id));
  END IF;

  RETURN jsonb_build_object('ok',true,'booking_id',p_booking_id,'hold',v_hold_res,'invoices',v_inv_res);
END; $function$;

-- Recovery
DELETE FROM public.wallet_transactions WHERE reference_id='c8d73f1c-0d02-494e-aed8-79386c5ae7ad';
DO $$
DECLARE r jsonb;
BEGIN
  r := public.confirm_paid_booking('c8d73f1c-0d02-494e-aed8-79386c5ae7ad'::uuid,'event','00df072f-efec-4863-8864-ab83a69456cd',50000);
  RAISE NOTICE 'recovery: %', r::text;
  IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'recovery_failed: %', r::text; END IF;
END$$;