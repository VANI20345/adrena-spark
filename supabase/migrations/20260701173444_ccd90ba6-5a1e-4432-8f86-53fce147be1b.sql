
-- Default loyalty earn rate setting (1%)
INSERT INTO public.system_settings (key, value, description)
VALUES ('loyalty_earn_percent', '1'::jsonb, 'Loyalty points earned per SAR spent, as percent (1 = 1%)')
ON CONFLICT (key) DO NOTHING;

-- Update confirm_paid_booking: deduct points, richer fin_log, configurable loyalty rate
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
  v_commission numeric := 0; v_commission_vat numeric := 0; v_provider_earnings numeric := 0;
  v_earn_pct numeric; v_earn_raw jsonb;
BEGIN
  IF p_booking_id IS NULL OR p_booking_type IS NULL OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','missing_params'); END IF;
  v_ref_type := CASE WHEN p_booking_type='service' THEN 'service_booking' ELSE 'event_booking' END;

  IF p_booking_type='service' THEN
    SELECT user_id,total_amount,status,provider_id,COALESCE(quantity,1),
           COALESCE(platform_commission,0), COALESCE(vat_on_commission,0), COALESCE(provider_earnings,0)
      INTO v_user_id,v_total,v_status,v_provider_id,v_quantity,v_commission,v_commission_vat,v_provider_earnings
    FROM public.service_bookings WHERE id=p_booking_id FOR UPDATE;
  ELSE
    SELECT user_id,total_amount,status,COALESCE(quantity,1),event_id,COALESCE(points_used,0),
           COALESCE(platform_commission,0), COALESCE(vat_on_commission,vat_amount,0), COALESCE(provider_earnings,0)
      INTO v_user_id,v_total,v_status,v_quantity,v_event_id,v_points_used,v_commission,v_commission_vat,v_provider_earnings
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

  -- Atomic: deduct reserved loyalty points from user_gamification (idempotent via loyalty_ledger)
  IF v_points_used > 0 AND NOT EXISTS (
    SELECT 1 FROM public.loyalty_ledger
     WHERE reference_id=p_booking_id AND reference_type=v_ref_type AND type='redeemed'
  ) THEN
    UPDATE public.user_gamification
       SET points_balance = GREATEST(0, COALESCE(points_balance,0) - v_points_used),
           updated_at = now()
     WHERE user_id = v_user_id;
    INSERT INTO public.loyalty_ledger (user_id,points,type,description,reference_id,reference_type)
    VALUES (v_user_id, -v_points_used, 'redeemed', 'خصم نقاط عند تأكيد الحجز', p_booking_id, v_ref_type);
  END IF;

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

  -- Configurable loyalty earn rate (percent). Default 1%.
  SELECT value INTO v_earn_raw FROM public.system_settings WHERE key='loyalty_earn_percent';
  v_earn_pct := COALESCE(
    NULLIF(trim(both '"' from COALESCE(v_earn_raw,'"1"')::text), '')::numeric,
    1
  );
  v_points := floor(v_total * v_earn_pct / 100.0);
  IF v_points>0 AND NOT EXISTS (
    SELECT 1 FROM public.loyalty_ledger WHERE reference_id=p_booking_id AND reference_type=v_ref_type AND type='earned'
  ) THEN
    INSERT INTO public.loyalty_ledger (user_id,points,type,description,reference_id,reference_type)
    VALUES (v_user_id,v_points,'earned','نقاط من حجز',p_booking_id,v_ref_type);
    UPDATE public.user_gamification
       SET points_balance = COALESCE(points_balance,0) + v_points,
           updated_at = now()
     WHERE user_id = v_user_id;
  END IF;

  -- Rich audit row: commission + VAT + net now populated.
  INSERT INTO public.financial_transaction_logs
    (transaction_type,amount,commission_amount,vat_amount,net_amount,
     status,reference_type,reference_id,payer_id,receiver_id,service_type,metadata)
  VALUES ('booking_payment',v_total,v_commission,v_commission_vat,v_provider_earnings,
          'completed',v_ref_type,p_booking_id,v_user_id,v_provider_id,p_booking_type,
    jsonb_build_object('payment_id',p_payment_id,'points_used',v_points_used,'points_earned',v_points));

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

-- Update generate_booking_invoices to populate commission_rate
CREATE OR REPLACE FUNCTION public.generate_booking_invoices(p_booking_id uuid, p_booking_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id uuid; v_customer_id uuid;
  v_total numeric; v_commission numeric; v_commission_vat numeric;
  v_provider_earnings numeric; v_total_vat numeric; v_commission_rate numeric := 0;
  v_provider_name text; v_provider_vat text; v_customer_name text;
  v_platform_vat text; v_platform_name text := 'منصة هواية';
  v_customer_invoice_id uuid; v_provider_invoice_id uuid; v_ref_type text;
BEGIN
  v_platform_vat := COALESCE(
    NULLIF(REPLACE((SELECT (value)::text FROM public.system_settings WHERE key='platform_vat_number'),'"',''),''),
    ''
  );

  IF p_booking_type = 'service' THEN
    v_ref_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.platform_commission,
           COALESCE(sb.vat_on_commission, 0), sb.provider_earnings, COALESCE(sb.commission_rate,0)
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings, v_commission_rate
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_ref_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.platform_commission,
           COALESCE(b.vat_on_commission, 0), b.provider_earnings, COALESCE(b.commission_rate,0)
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings, v_commission_rate
    FROM public.bookings b JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;
  IF COALESCE(v_total,0) <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'free_booking');
  END IF;

  v_total_vat := ROUND((v_total * 15.0 / 115.0)::numeric, 2);
  IF COALESCE(v_commission_vat,0) = 0 AND v_commission > 0 THEN
    v_commission_vat := ROUND((v_commission * 15.0 / 115.0)::numeric, 2);
  END IF;

  SELECT full_name, vat_number INTO v_provider_name, v_provider_vat
  FROM public.profiles WHERE user_id = v_provider_id;
  SELECT full_name INTO v_customer_name
  FROM public.profiles WHERE user_id = v_customer_id;

  IF EXISTS (SELECT 1 FROM public.platform_invoices
             WHERE reference_id = p_booking_id AND reference_type = v_ref_type) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, invoice_audience,
    reference_type, reference_id,
    customer_id, customer_name,
    provider_id, provider_name,
    platform_name, platform_vat_number,
    gross_amount, commission_rate, commission_amount,
    vat_on_commission, total_vat_amount, net_commission, provider_net_amount,
    invoice_date, status
  ) VALUES (
    public.generate_invoice_number(), 'customer', 'customer',
    v_ref_type, p_booking_id,
    v_customer_id, v_customer_name,
    v_provider_id, v_provider_name,
    v_platform_name, v_platform_vat,
    v_total, v_commission_rate, 0,
    0, v_total_vat, ROUND((v_total - v_total_vat)::numeric, 2), v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_customer_invoice_id;

  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, invoice_audience,
    reference_type, reference_id,
    customer_id, customer_name,
    provider_id, provider_name, provider_vat_number,
    platform_name, platform_vat_number,
    gross_amount, commission_rate, commission_amount,
    vat_on_commission, total_vat_amount, net_commission, provider_net_amount,
    invoice_date, status
  ) VALUES (
    public.generate_invoice_number(), 'commission', 'provider',
    v_ref_type, p_booking_id,
    v_customer_id, v_customer_name,
    v_provider_id, v_provider_name, v_provider_vat,
    v_platform_name, v_platform_vat,
    v_total, v_commission_rate, v_commission,
    v_commission_vat, v_commission_vat,
    ROUND((v_commission - v_commission_vat)::numeric, 2),
    v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_provider_invoice_id;

  RETURN jsonb_build_object('ok', true,
    'customer_invoice_id', v_customer_invoice_id,
    'commission_invoice_id', v_provider_invoice_id);
END;
$function$;
