
-- 1) Add total_vat_amount column to platform_invoices
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS total_vat_amount numeric DEFAULT 0;

-- 2) Backfill: customer invoices currently store full VAT in vat_on_commission; move it
UPDATE public.platform_invoices
SET total_vat_amount = vat_on_commission,
    vat_on_commission = 0
WHERE invoice_audience = 'customer'
  AND COALESCE(total_vat_amount, 0) = 0
  AND COALESCE(vat_on_commission, 0) > 0;

-- For commission invoices, total_vat_amount mirrors vat_on_commission for reporting
UPDATE public.platform_invoices
SET total_vat_amount = vat_on_commission
WHERE invoice_audience = 'provider'
  AND COALESCE(total_vat_amount, 0) = 0;

-- 3) Update generate_booking_invoices to populate total_vat_amount correctly
CREATE OR REPLACE FUNCTION public.generate_booking_invoices(p_booking_id uuid, p_booking_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id uuid; v_customer_id uuid;
  v_total numeric; v_commission numeric; v_commission_vat numeric;
  v_provider_earnings numeric; v_total_vat numeric;
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
           COALESCE(sb.vat_on_commission, 0), sb.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_ref_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.platform_commission,
           COALESCE(b.vat_on_commission, 0), b.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings
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
  -- Recompute commission VAT defensively (15% of platform commission, VAT-inclusive extraction)
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

  -- Customer invoice: total_vat_amount = full VAT; vat_on_commission = 0
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
    v_total, 0, 0,
    0, v_total_vat, ROUND((v_total - v_total_vat)::numeric, 2), v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_customer_invoice_id;

  -- Commission invoice: vat_on_commission = real VAT on commission; total_vat_amount mirrors it
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
    v_total, 0, v_commission,
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

-- 4) VAT number validation trigger (Saudi: 15 digits, starts & ends with 3)
CREATE OR REPLACE FUNCTION public.validate_saudi_vat_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_val text;
BEGIN
  IF TG_TABLE_NAME = 'system_settings' THEN
    IF NEW.key <> 'platform_vat_number' THEN RETURN NEW; END IF;
    v_val := NULLIF(REPLACE((NEW.value)::text,'"',''),'');
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_val := NULLIF(NEW.vat_number, '');
  END IF;
  IF v_val IS NULL THEN RETURN NEW; END IF;
  IF v_val !~ '^3[0-9]{13}3$' THEN
    RAISE EXCEPTION 'Invalid Saudi VAT number: must be 15 digits starting and ending with 3 (got %)', v_val;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_platform_vat ON public.system_settings;
CREATE TRIGGER trg_validate_platform_vat
  BEFORE INSERT OR UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_saudi_vat_number();

DROP TRIGGER IF EXISTS trg_validate_profile_vat ON public.profiles;
CREATE TRIGGER trg_validate_profile_vat
  BEFORE INSERT OR UPDATE OF vat_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_saudi_vat_number();

-- 5) Wrap confirm_paid_booking's hold call so failures are logged (not silent)
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
