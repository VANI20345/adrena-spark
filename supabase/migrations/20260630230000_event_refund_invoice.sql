-- 1) Create generate_refund_invoice function
CREATE OR REPLACE FUNCTION public.generate_refund_invoice(p_refund_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund RECORD;
  v_hold RECORD;
  v_customer_name text;
  v_provider_name text;
  v_provider_vat text;
  v_platform_vat text;
  v_platform_name text := 'منصة هواية';
  v_invoice_id uuid;
  v_total_vat numeric;
  v_provider_reversal numeric;
  v_refund_ratio numeric;
BEGIN
  -- Fetch refund record
  SELECT * INTO v_refund FROM public.refunds WHERE id = p_refund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'refund_not_found');
  END IF;

  -- Check if invoice already exists to avoid duplicates
  IF EXISTS (SELECT 1 FROM public.platform_invoices WHERE reference_id = p_refund_id AND reference_type = 'refund') THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'invoice_already_exists');
  END IF;

  -- Fetch hold record
  SELECT * INTO v_hold FROM public.payment_holds WHERE source_id = v_refund.booking_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payment_hold_not_found');
  END IF;

  -- Fetch profiles
  SELECT full_name INTO v_customer_name FROM public.profiles WHERE user_id = v_refund.user_id;
  SELECT full_name, vat_number INTO v_provider_name, v_provider_vat FROM public.profiles WHERE user_id = v_hold.provider_id;

  v_platform_vat := COALESCE(
    NULLIF(REPLACE((SELECT (value)::text FROM public.system_settings WHERE key='platform_vat_number'),'"',''),''),
    ''
  );

  -- Calculate details
  v_refund_ratio := v_refund.amount / v_hold.gross_amount;
  v_provider_reversal := ROUND(v_hold.net_amount * v_refund_ratio, 2);
  v_total_vat := ROUND((v_refund.amount * 15.0 / 115.0)::numeric, 2);

  -- Insert platform invoice
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
    public.generate_invoice_number(), 'refund', 'customer',
    'refund', p_refund_id,
    v_refund.user_id, v_customer_name,
    v_hold.provider_id, v_provider_name, v_provider_vat,
    v_platform_name, v_platform_vat,
    v_refund.amount, 0, 0,
    0, v_total_vat, 0, v_provider_reversal,
    now(), 'refunded'
  ) RETURNING id INTO v_invoice_id;

  -- Link invoice_id to financial transactions log
  UPDATE public.financial_transaction_logs
     SET invoice_id = v_invoice_id
   WHERE reference_id = p_refund_id AND reference_type = 'refund';

  RETURN jsonb_build_object('ok', true, 'invoice_id', v_invoice_id);
END;
$$;

-- 2) Update process_refund to call generate_refund_invoice atomically
CREATE OR REPLACE FUNCTION public.process_refund(p_refund_id uuid, p_admin_override_amount numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_refund record; v_hold record; v_amount numeric;
  v_provider_id uuid; v_user_id uuid; v_wallet record;
  v_deduct_balance numeric := 0; v_deduct_held numeric := 0;
  v_is_admin boolean;
  v_refund_ratio numeric;
  v_provider_reversal numeric;
  v_platform_reversal numeric;
  v_payment_id text;
BEGIN
  v_is_admin := public.is_admin(v_caller) OR public.is_super_admin(v_caller);
  SELECT * INTO v_refund FROM public.refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','refund_not_found'); END IF;
  IF v_refund.status NOT IN ('requested','pending','approved','manual_review') THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_status','current',v_refund.status);
  END IF;
  IF v_refund.status='manual_review' AND NOT v_is_admin THEN RETURN jsonb_build_object('ok',false,'error','admin_required'); END IF;
  IF p_admin_override_amount IS NOT NULL AND NOT v_is_admin THEN RETURN jsonb_build_object('ok',false,'error','admin_required'); END IF;

  v_amount := COALESCE(p_admin_override_amount, v_refund.eligible_amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    UPDATE public.refunds SET status='rejected', failure_reason='no_eligible_amount',
      processed_at=now(), processed_by=v_caller WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','no_eligible_amount');
  END IF;

  -- Load and lock the hold record
  SELECT * INTO v_hold FROM public.payment_holds WHERE source_id=v_refund.booking_id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.refunds SET status='manual_review', failure_reason='no_payment_hold_found', updated_at=now() WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','no_payment_hold_found');
  END IF;

  v_provider_id := v_hold.provider_id;
  v_user_id := v_refund.user_id;

  UPDATE public.refunds SET status='processing', updated_at=now() WHERE id=p_refund_id;

  -- Get Moyasar payment ID from booking record
  IF v_refund.booking_type = 'service' THEN
    SELECT payment_id INTO v_payment_id FROM public.service_bookings WHERE id = v_refund.booking_id;
  ELSE
    SELECT payment_id INTO v_payment_id FROM public.bookings WHERE id = v_refund.booking_id;
  END IF;

  -- Calculate exact ratio and splits
  v_refund_ratio := v_amount / v_hold.gross_amount;
  -- Provider only pays back their proportion of the provider_earnings (net_amount)
  v_provider_reversal := ROUND(v_hold.net_amount * v_refund_ratio, 2);
  -- Platform covers its commission and VAT reversal portion
  v_platform_reversal := v_amount - v_provider_reversal;

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id=v_provider_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.refunds SET status='manual_review', failure_reason='provider_wallet_missing', updated_at=now() WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','provider_wallet_missing');
  END IF;

  -- Calculate balance vs held-balance deductions
  IF v_hold.status = 'released' THEN
    v_deduct_balance := v_provider_reversal;
    v_deduct_held := 0;
  ELSE
    -- If hold is still 'held', deduct held portion proportionately
    v_deduct_held := ROUND(v_hold.held_amount * v_refund_ratio, 2);
    v_deduct_balance := v_provider_reversal - v_deduct_held;
    
    -- If provider doesn't have enough held_balance, shift the difference to standard balance (allowing negative)
    IF v_deduct_held > COALESCE(v_wallet.held_balance, 0) THEN
      v_deduct_balance := v_deduct_balance + (v_deduct_held - COALESCE(v_wallet.held_balance, 0));
      v_deduct_held := COALESCE(v_wallet.held_balance, 0);
    END IF;
  END IF;

  -- Update provider wallet (allows negative balance)
  UPDATE public.user_wallets
     SET balance = balance - v_deduct_balance,
         held_balance = GREATEST(0, COALESCE(held_balance,0) - v_deduct_held),
         total_refunded = COALESCE(total_refunded,0) + v_provider_reversal,
         updated_at = now()
   WHERE user_id = v_provider_id;

  -- Credit customer's wallet with the refunded amount
  INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
  VALUES (v_user_id, v_amount, 0, 0)
  ON CONFLICT (user_id) DO UPDATE
     SET balance = public.user_wallets.balance + EXCLUDED.balance,
         updated_at = now();

  -- Update payment hold status
  UPDATE public.payment_holds
     SET status='refunded'::payment_hold_status,
         available_amount = GREATEST(0, COALESCE(available_amount,0) - v_deduct_balance),
         held_amount = GREATEST(0, COALESCE(held_amount,0) - v_deduct_held),
         updated_at = now()
   WHERE id = v_hold.id;

  -- Record wallet transactions
  -- Provider deduction log
  INSERT INTO public.wallet_transactions
    (user_id,type,amount,description,status,reference_id,reference_type)
  VALUES
    (v_provider_id,'refund_deduction', -v_provider_reversal,
     'خصم استرداد حجز الفعالية #'||substring(v_refund.booking_id::text,1,8),
     'completed',p_refund_id,'refund');

  -- Customer refund credit log
  INSERT INTO public.wallet_transactions
    (user_id,type,amount,description,status,reference_id,reference_type)
  VALUES
    (v_user_id,'refund_credit', v_amount,
     'استرداد رصيد حجز الفعالية #'||substring(v_refund.booking_id::text,1,8),
     'completed',p_refund_id,'refund');

  -- Update booking status
  IF v_refund.booking_type='service' THEN
    UPDATE public.service_bookings SET status='refunded', updated_at=now() WHERE id=v_refund.booking_id;
  ELSE
    UPDATE public.bookings SET status='refunded' WHERE id=v_refund.booking_id;
  END IF;

  -- Update refund request record and populate Moyasar fields
  UPDATE public.refunds 
     SET status='completed', 
         amount=v_amount, 
         payment_hold_id=v_hold.id,
         moyasar_payment_id=v_payment_id,
         is_full_refund=(v_amount = v_hold.gross_amount),
         refund_status='completed',
         processed_at=now(), 
         processed_by=v_caller,
         auto_processed=(v_refund.status IN ('requested','pending','approved') AND p_admin_override_amount IS NULL),
         failure_reason=NULL, 
         updated_at=now() 
   WHERE id=p_refund_id;

  -- Record platform invoice for this refund
  PERFORM public.generate_refund_invoice(p_refund_id);

  -- Record canonical financial logs
  -- Log provider's reversal share
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, net_amount, reference_type, reference_id,
     payer_id, receiver_id, status, metadata)
  VALUES
    ('refund_approved', v_provider_reversal, v_provider_reversal, 'refund', p_refund_id,
     v_provider_id, v_user_id, 'completed',
     jsonb_build_object('booking_id', v_refund.booking_id, 'hold_id', v_hold.id,
                        'share', 'provider_earnings_reversal',
                        'deducted_from_balance', v_deduct_balance,
                        'deducted_from_held', v_deduct_held,
                        'processed_by', v_caller));

  -- Log platform's commission reversal share
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, net_amount, reference_type, reference_id,
     payer_id, receiver_id, status, metadata)
  VALUES
    ('refund_approved', v_platform_reversal, v_platform_reversal, 'refund', p_refund_id,
     NULL, v_user_id, 'completed',
     jsonb_build_object('booking_id', v_refund.booking_id, 'hold_id', v_hold.id,
                        'share', 'platform_commission_reversal',
                        'processed_by', v_caller));

  -- Send notifications
  INSERT INTO public.notifications (user_id, type, title, message, data) VALUES
    (v_user_id,'refund_completed','تم تنفيذ الاسترداد',
     'تم استرداد مبلغ '||v_amount::text||' ريال إلى محفظتك.',
     jsonb_build_object('refund_id',p_refund_id,'amount',v_amount)),
    (v_provider_id,'refund_deducted','تم خصم استرداد حجز',
     'تم خصم ربحك بقيمة '||v_provider_reversal::text||' ريال (استرداد لحجز فعالية).',
     jsonb_build_object('refund_id',p_refund_id,'amount',v_provider_reversal));

  PERFORM public.sync_hold_dispute_state(v_refund.booking_id);

  RETURN jsonb_build_object('ok',true,'refund_id',p_refund_id,'amount',v_amount,
    'provider_reversal',v_provider_reversal,'platform_reversal',v_platform_reversal,
    'deducted_balance',v_deduct_balance,'deducted_held',v_deduct_held);
END;
$function$;
