-- 1) Drop wallet balance check constraint to allow negative balance
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_balance_check;

-- 2) Alter refunds table to add Moyasar integration fields
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS moyasar_payment_id text,
  ADD COLUMN IF NOT EXISTS moyasar_refund_id text,
  ADD COLUMN IF NOT EXISTS is_full_refund boolean,
  ADD COLUMN IF NOT EXISTS refund_status text;

-- 3) Create helper function to credit provider wallet and automatically recover negative balance
CREATE OR REPLACE FUNCTION public.credit_provider_wallet(
  p_provider_id uuid,
  p_amount numeric,
  p_held_amount numeric,
  p_description text,
  p_reference_id uuid,
  p_reference_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_recovered numeric := 0;
BEGIN
  -- Lock user wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_provider_id FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
    VALUES (p_provider_id, p_amount, p_amount, p_held_amount);
  ELSE
    -- If balance is negative and provider is earning positive amounts
    IF v_wallet.balance < 0 AND p_amount > 0 THEN
      v_recovered := LEAST(p_amount, -v_wallet.balance);
      
      INSERT INTO public.wallet_transactions (
        user_id, type, amount, description, status, reference_id, reference_type
      ) VALUES (
        p_provider_id,
        'negative_balance_recovery',
        -v_recovered, -- Debit transaction log to offset debt
        'تسوية رصيد سالب تلقائياً من أرباح حجز #' || substring(p_reference_id::text, 1, 8),
        'completed',
        p_reference_id,
        p_reference_type
      );
    END IF;
    
    -- Update the wallet
    UPDATE public.user_wallets
       SET balance = balance + p_amount,
           total_earned = total_earned + p_amount,
           held_balance = held_balance + p_held_amount,
           updated_at = now()
     WHERE user_id = p_provider_id;
  END IF;
END;
$$;

-- 4) Update create_payment_hold_with_split to use the new wallet credit helper
CREATE OR REPLACE FUNCTION public.create_payment_hold_with_split(p_booking_id uuid, p_booking_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id uuid; v_user_id uuid; v_total numeric;
  v_provider_earnings numeric; v_platform_commission numeric; v_vat numeric;
  v_hold_pct numeric; v_immediate_pct numeric; v_hold_hours integer;
  v_available numeric; v_held numeric;
  v_event_end timestamptz; v_hold_until timestamptz;
  v_hold_id uuid; v_existing_hold uuid;
  v_source_type text; v_booking_table text;
  v_raw_setting jsonb;
  v_status payment_hold_status;
  v_review hold_review_state;
  v_released_at timestamptz;
  v_log_type text; v_log_status text;
BEGIN
  SELECT id INTO v_existing_hold FROM public.payment_holds WHERE source_id = p_booking_id LIMIT 1;
  IF v_existing_hold IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'hold_id', v_existing_hold, 'skipped', true);
  END IF;

  SELECT value INTO v_raw_setting FROM public.system_settings WHERE key = 'wallet_hold_percent';
  IF v_raw_setting IS NOT NULL THEN
    IF jsonb_typeof(v_raw_setting) = 'object' AND v_raw_setting ? 'percentage' THEN
      v_hold_pct := COALESCE((v_raw_setting->>'percentage')::numeric, 30);
    ELSE
      v_hold_pct := COALESCE(NULLIF(trim(both '"' from v_raw_setting::text), '')::numeric, 30);
    END IF;
  ELSE
    v_hold_pct := 30;
  END IF;
  v_immediate_pct := 100 - v_hold_pct;

  v_hold_hours := COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '')::integer FROM public.system_settings WHERE key = 'payment_hold_hours'),
    72
  );

  IF p_booking_type = 'service' THEN
    v_booking_table := 'service_bookings'; v_source_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.provider_earnings, sb.platform_commission,
           COALESCE(sb.vat_on_commission, 0),
           CASE WHEN sb.service_date IS NOT NULL AND sb.end_time IS NOT NULL
                THEN (substring(sb.service_date::text from 1 for 10) || ' ' || sb.end_time)::timestamptz
                ELSE now() END
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings, v_platform_commission, v_vat, v_event_end
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_booking_table := 'bookings'; v_source_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.provider_earnings, b.platform_commission,
           COALESCE(b.vat_on_commission, b.vat_amount), e.end_date
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings, v_platform_commission, v_vat, v_event_end
    FROM public.bookings b JOIN public.events e ON e.id = b.event_id WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_or_provider_not_found');
  END IF;

  v_provider_earnings := COALESCE(v_provider_earnings, 0);
  v_platform_commission := COALESCE(v_platform_commission, 0);
  v_vat := COALESCE(v_vat, 0);

  v_held := ROUND((v_provider_earnings * v_hold_pct / 100.0)::numeric, 2);
  v_available := ROUND((v_provider_earnings - v_held)::numeric, 2);
  v_hold_until := GREATEST(now(), COALESCE(v_event_end, now())) + (v_hold_hours || ' hours')::interval;

  IF v_held = 0 THEN
    v_status := 'released'::payment_hold_status;
    v_review := 'no_hold_required'::hold_review_state;
    v_released_at := now();
    v_log_type := 'hold_not_required';
    v_log_status := 'released';
  ELSE
    v_status := 'held'::payment_hold_status;
    v_review := 'pending'::hold_review_state;
    v_released_at := NULL;
    v_log_type := 'hold_created';
    v_log_status := 'held';
  END IF;

  INSERT INTO public.payment_holds (
    source_type, source_id, provider_id, payer_id, gross_amount, platform_fee, vat_amount, net_amount,
    available_amount, held_amount, currency, status, event_end_at, hold_until,
    complaint_extension, booking_table, auto_split_percent, review_state, released_at
  ) VALUES (
    v_source_type::payment_hold_source, p_booking_id, v_provider_id, v_user_id,
    v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_available, v_held, 'SAR', v_status, v_event_end, v_hold_until,
    false, v_booking_table, v_immediate_pct::int, v_review, v_released_at
  ) RETURNING id INTO v_hold_id;

  -- Use helper to credit provider's wallet with auto-recovery of negative balances
  PERFORM public.credit_provider_wallet(
    v_provider_id,
    v_available,
    v_held,
    'أرباح حجز #' || substring(p_booking_id::text, 1, 8),
    p_booking_id,
    v_source_type
  );

  IF v_available > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, description, status, reference_id, reference_type)
    VALUES (v_provider_id, 'credit', v_available,
      'إيرادات فورية (' || v_immediate_pct::text || '%) من حجز #' || substring(p_booking_id::text, 1, 8),
      'completed', p_booking_id, v_source_type);
  END IF;

  INSERT INTO public.financial_transaction_logs (
    transaction_type, amount, commission_amount, vat_amount, net_amount,
    payer_id, receiver_id, reference_type, reference_id, service_type, status, metadata
  ) VALUES (
    v_log_type, v_held, v_platform_commission, v_vat, v_provider_earnings,
    v_user_id, v_provider_id, v_source_type, p_booking_id, 'hold', v_log_status,
    jsonb_build_object(
      'hold_pct', v_hold_pct,
      'immediate_pct', v_immediate_pct,
      'hold_id', v_hold_id,
      'available_amount', v_available,
      'held_amount', v_held,
      'review_state', v_review::text
    )
  );

  RETURN jsonb_build_object(
    'ok', true, 'hold_id', v_hold_id,
    'available_amount', v_available, 'held_amount', v_held,
    'hold_pct', v_hold_pct, 'immediate_pct', v_immediate_pct,
    'status', v_status::text, 'review_state', v_review::text
  );
END;
$function$;

-- 5) Update release_payment_hold to include negative balance recovery logic on balance release
CREATE OR REPLACE FUNCTION public.release_payment_hold(
  p_hold_id uuid,
  p_notes text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_caller uuid := auth.uid();
  v_has_open_dispute boolean;
  v_wallet RECORD;
  v_recovered numeric := 0;
BEGIN
  -- 1) Authorization: admin OR super_admin only
  IF v_caller IS NULL OR NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 2) Lock the row
  SELECT * INTO v_hold
  FROM public.payment_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- 3) Status must be 'held'
  IF v_hold.status <> 'held' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'current_status', v_hold.status);
  END IF;

  -- Self-heal: if the hold time has passed, we automatically mark it as ready_for_release
  IF v_hold.review_state = 'pending' AND v_hold.hold_until <= now() AND NOT v_hold.complaint_extension THEN
    v_hold.review_state := 'ready_for_release';
    UPDATE public.payment_holds
       SET review_state = 'ready_for_release', updated_at = now()
     WHERE id = p_hold_id;
  END IF;

  -- Validate review_state (allow override if p_force is true and caller is super_admin)
  IF v_hold.review_state <> 'ready_for_release' AND NOT (p_force AND public.is_super_admin(v_caller)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_ready_for_release', 'review_state', v_hold.review_state);
  END IF;

  -- 4) complaint_extension check (allow override if p_force is true and caller is super_admin)
  IF v_hold.complaint_extension AND NOT (p_force AND public.is_super_admin(v_caller)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'complaint_active');
  END IF;

  -- 5) Dispute check (allow override if p_force is true and caller is super_admin)
  SELECT EXISTS (
    SELECT 1 FROM public.refunds
    WHERE booking_id = v_hold.source_id
      AND status IN ('pending','processing','requested')
  ) OR EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE entity_type IN ('booking','service_booking','event_booking')
      AND entity_id = v_hold.source_id
      AND status IN ('open','replied','in_progress','pending')
  ) INTO v_has_open_dispute;

  IF v_has_open_dispute AND NOT (p_force AND public.is_super_admin(v_caller)) THEN
    UPDATE public.payment_holds
       SET complaint_extension = true,
           review_state = 'dispute_hold',
           updated_at = now()
     WHERE id = p_hold_id;
    RETURN jsonb_build_object('ok', false, 'error', 'open_dispute_detected');
  END IF;

  -- 6) Mark released
  UPDATE public.payment_holds
     SET status = 'released',
         released_at = now(),
         released_by = v_caller,
         notes = COALESCE(p_notes, notes),
         updated_at = now()
   WHERE id = p_hold_id;

  -- 7) Move held_amount → balance in wallet with negative recovery check
  IF COALESCE(v_hold.held_amount, 0) > 0 THEN
    SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_hold.provider_id FOR UPDATE;
    
    IF v_wallet.balance < 0 THEN
      v_recovered := LEAST(v_hold.held_amount, -v_wallet.balance);
      
      INSERT INTO public.wallet_transactions (
        user_id, type, amount, description, status, reference_id, reference_type
      ) VALUES (
        v_hold.provider_id,
        'negative_balance_recovery',
        -v_recovered,
        'تسوية رصيد سالب تلقائياً عند الإفراج عن حجز #' || substring(v_hold.source_id::text, 1, 8),
        'completed',
        v_hold.source_id,
        v_hold.source_type::text
      );
    END IF;

    UPDATE public.user_wallets
       SET balance = balance + v_hold.held_amount,
           held_balance = GREATEST(0, held_balance - v_hold.held_amount),
           updated_at = now()
     WHERE user_id = v_hold.provider_id;

    -- 8) Wallet transaction
    INSERT INTO public.wallet_transactions (
      user_id, type, amount, description, status, reference_id, reference_type
    ) VALUES (
      v_hold.provider_id, 'release', v_hold.held_amount,
      'إفراج عن المبلغ المحجوز (30%) من حجز #' || substring(v_hold.source_id::text, 1, 8),
      'completed', v_hold.source_id, v_hold.source_type::text
    );

    -- 9) Financial log
    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, net_amount, reference_type, reference_id,
      payer_id, receiver_id, status, metadata
    ) VALUES (
      'hold_released', v_hold.held_amount, v_hold.held_amount,
      'payment_hold', p_hold_id,
      NULL, v_hold.provider_id, 'completed',
      jsonb_build_object(
        'hold_id', p_hold_id,
        'booking_id', v_hold.source_id,
        'released_by', v_caller,
        'notes', p_notes,
        'forced', p_force
      )
    );

    -- 10) Notify provider
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_hold.provider_id, 'funds_released',
      'تم الإفراج عن أموالك المحجوزة',
      'تم تحويل ' || v_hold.held_amount::text || ' ريال من المبلغ المحجوز إلى رصيدك المتاح.',
      jsonb_build_object(
        'hold_id', p_hold_id,
        'booking_id', v_hold.source_id,
        'amount', v_hold.held_amount
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'hold_id', p_hold_id,
    'amount', v_hold.held_amount,
    'released_by', v_caller
  );
END;
$$;

-- 6) Recreate process_refund to handle proportionate refund reversals and negative balance support
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

  -- 5) Update provider wallet (allows negative balance)
  UPDATE public.user_wallets
     SET balance = balance - v_deduct_balance,
         held_balance = GREATEST(0, COALESCE(held_balance,0) - v_deduct_held),
         total_refunded = COALESCE(total_refunded,0) + v_provider_reversal,
         updated_at = now()
   WHERE user_id = v_provider_id;

  -- 6) Credit customer's wallet with the refunded amount
  INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
  VALUES (v_user_id, v_amount, 0, 0)
  ON CONFLICT (user_id) DO UPDATE
     SET balance = public.user_wallets.balance + EXCLUDED.balance,
         updated_at = now();

  -- 7) Update payment hold status
  UPDATE public.payment_holds
     SET status='refunded'::payment_hold_status,
         available_amount = GREATEST(0, COALESCE(available_amount,0) - v_deduct_balance),
         held_amount = GREATEST(0, COALESCE(held_amount,0) - v_deduct_held),
         updated_at = now()
   WHERE id = v_hold.id;

  -- 8) Record wallet transactions
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

  -- 9) Update booking status
  IF v_refund.booking_type='service' THEN
    UPDATE public.service_bookings SET status='refunded', updated_at=now() WHERE id=v_refund.booking_id;
  ELSE
    UPDATE public.bookings SET status='refunded' WHERE id=v_refund.booking_id;
  END IF;

  -- 10) Update refund request record and populate Moyasar fields
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

  -- 11) Record canonical financial logs
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

  -- 12) Send notifications
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
