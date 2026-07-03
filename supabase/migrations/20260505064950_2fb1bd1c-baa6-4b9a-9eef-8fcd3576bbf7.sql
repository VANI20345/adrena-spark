CREATE OR REPLACE FUNCTION public.confirm_paid_booking(p_booking_id uuid, p_booking_type text, p_payment_id text, p_provider_amount_halalas integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- ATOMIC: hold/split must succeed
  BEGIN
    v_hold_res := public.create_payment_hold_with_split(p_booking_id,p_booking_type);
    IF (v_hold_res->>'ok')::boolean IS DISTINCT FROM true THEN
      INSERT INTO public.system_logs(level,message,details,user_id)
      VALUES ('error','create_payment_hold_with_split returned not-ok',
        jsonb_build_object('booking_id',p_booking_id,'result',v_hold_res),v_user_id);
      RAISE EXCEPTION 'create_payment_hold_with_split failed: %', v_hold_res::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs(level,message,details,user_id)
    VALUES ('error','create_payment_hold_with_split exception',
      jsonb_build_object('booking_id',p_booking_id,'err',SQLERRM),v_user_id);
    RAISE;
  END;

  -- ATOMIC: invoices MUST succeed (rollback whole tx on failure)
  BEGIN
    v_inv_res := public.generate_booking_invoices(p_booking_id,p_booking_type);
    IF v_inv_res IS NULL OR (v_inv_res ? 'ok' AND (v_inv_res->>'ok')::boolean IS DISTINCT FROM true) THEN
      INSERT INTO public.system_logs(level,message,details,user_id)
      VALUES ('error','generate_booking_invoices returned not-ok',
        jsonb_build_object('booking_id',p_booking_id,'result',v_inv_res),v_user_id);
      RAISE EXCEPTION 'generate_booking_invoices failed: %', COALESCE(v_inv_res::text,'null');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs(level,message,details,user_id)
    VALUES ('error','generate_booking_invoices exception',
      jsonb_build_object('booking_id',p_booking_id,'err',SQLERRM),v_user_id);
    RAISE;
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