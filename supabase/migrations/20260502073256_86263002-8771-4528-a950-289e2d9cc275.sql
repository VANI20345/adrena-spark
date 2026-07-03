
-- ============================================================================
-- PHASE 5: Automated Refund System
-- ============================================================================

-- 1) Extend refunds table
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS refund_type text NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS eligible_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_hold_id uuid REFERENCES public.payment_holds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS auto_processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS refunds_status_check;

ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_status_check
  CHECK (status IN ('requested','pending','processing','approved','completed','rejected','manual_review','failed'));

ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS refunds_booking_type_check;
ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_booking_type_check CHECK (booking_type IN ('event','service'));

ALTER TABLE public.refunds
  DROP CONSTRAINT IF EXISTS refunds_refund_type_check;
ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_refund_type_check CHECK (refund_type IN ('automatic','manual','partial','full'));

CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) calculate_refund_eligibility
CREATE OR REPLACE FUNCTION public.calculate_refund_eligibility(
  p_booking_id uuid,
  p_booking_type text DEFAULT 'event'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_event_start timestamptz;
  v_user_id uuid;
  v_policy jsonb;
  v_early_days int;
  v_medium_days int;
  v_early_pct numeric;
  v_medium_pct numeric;
  v_late_pct numeric;
  v_days_until numeric;
  v_pct numeric;
  v_eligible numeric;
BEGIN
  v_policy := COALESCE(public.get_system_setting('refund_policy'),
    '{"early_days":7,"medium_days":3,"early_pct":100,"medium_pct":50,"late_pct":0}'::jsonb);

  v_early_days := COALESCE((v_policy->>'early_days')::int, 7);
  v_medium_days := COALESCE((v_policy->>'medium_days')::int, 3);
  v_early_pct := COALESCE((v_policy->>'early_pct')::numeric, 100);
  v_medium_pct := COALESCE((v_policy->>'medium_pct')::numeric, 50);
  v_late_pct := COALESCE((v_policy->>'late_pct')::numeric, 0);

  IF p_booking_type = 'service' THEN
    SELECT sb.user_id, sb.total_amount,
           CASE WHEN sb.service_date IS NOT NULL AND sb.start_time IS NOT NULL
                THEN (substring(sb.service_date from 1 for 10) || ' ' || sb.start_time)::timestamptz
                ELSE now() + interval '100 years' END
      INTO v_user_id, v_total, v_event_start
    FROM public.service_bookings sb
    WHERE sb.id = p_booking_id;
  ELSE
    SELECT b.user_id, b.total_amount, e.start_date
      INTO v_user_id, v_total, v_event_start
    FROM public.bookings b
    JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id;
  END IF;

  IF v_total IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'free_booking_no_refund');
  END IF;

  v_days_until := EXTRACT(EPOCH FROM (v_event_start - now())) / 86400.0;

  IF v_days_until < 0 THEN
    v_pct := 0;
  ELSIF v_days_until >= v_early_days THEN
    v_pct := v_early_pct;
  ELSIF v_days_until >= v_medium_days THEN
    v_pct := v_medium_pct;
  ELSE
    v_pct := v_late_pct;
  END IF;

  v_eligible := ROUND((v_total * v_pct / 100.0)::numeric, 2);

  RETURN jsonb_build_object(
    'ok', true,
    'total_amount', v_total,
    'event_start', v_event_start,
    'days_until', v_days_until,
    'eligible_pct', v_pct,
    'eligible_amount', v_eligible,
    'user_id', v_user_id,
    'requires_manual', (v_pct = 0 AND v_days_until >= 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_refund_eligibility(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_refund_eligibility(uuid,text) TO authenticated, service_role;

-- 3) process_refund — actual money movement, hold-aware
CREATE OR REPLACE FUNCTION public.process_refund(
  p_refund_id uuid,
  p_admin_override_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_refund record;
  v_hold record;
  v_amount numeric;
  v_provider_id uuid;
  v_user_id uuid;
  v_wallet record;
  v_deduct_balance numeric := 0;
  v_deduct_held numeric := 0;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_admin(v_caller) OR public.is_super_admin(v_caller);

  -- Lock refund
  SELECT * INTO v_refund FROM public.refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'refund_not_found');
  END IF;

  IF v_refund.status NOT IN ('requested','pending','approved','manual_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'current', v_refund.status);
  END IF;

  -- Authorization for manual_review and admin overrides
  IF v_refund.status = 'manual_review' AND NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_required');
  END IF;
  IF p_admin_override_amount IS NOT NULL AND NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'admin_required');
  END IF;

  v_amount := COALESCE(p_admin_override_amount, v_refund.eligible_amount);

  IF v_amount IS NULL OR v_amount <= 0 THEN
    UPDATE public.refunds
       SET status='rejected',
           failure_reason='no_eligible_amount',
           processed_at=now(),
           processed_by=v_caller
     WHERE id = p_refund_id;
    RETURN jsonb_build_object('ok', false, 'error', 'no_eligible_amount');
  END IF;

  -- Find associated payment_hold + provider
  SELECT * INTO v_hold FROM public.payment_holds
   WHERE source_id = v_refund.booking_id LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.refunds
       SET status='manual_review',
           failure_reason='no_payment_hold_found',
           updated_at=now()
     WHERE id = p_refund_id;
    RETURN jsonb_build_object('ok', false, 'error', 'no_payment_hold_found');
  END IF;

  v_provider_id := v_hold.provider_id;
  v_user_id := v_refund.user_id;

  -- Mark processing
  UPDATE public.refunds SET status='processing', updated_at=now() WHERE id = p_refund_id;

  -- Lock provider wallet
  SELECT * INTO v_wallet FROM public.user_wallets
   WHERE user_id = v_provider_id FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.refunds SET status='manual_review', failure_reason='provider_wallet_missing', updated_at=now()
     WHERE id = p_refund_id;
    RETURN jsonb_build_object('ok', false, 'error', 'provider_wallet_missing');
  END IF;

  -- Compute deduction split: balance first, then held_balance
  IF v_wallet.balance >= v_amount THEN
    v_deduct_balance := v_amount;
    v_deduct_held := 0;
  ELSE
    v_deduct_balance := GREATEST(0, v_wallet.balance);
    v_deduct_held := v_amount - v_deduct_balance;
    -- If even balance + held_balance is insufficient → manual review
    IF v_deduct_held > COALESCE(v_wallet.held_balance, 0) THEN
      UPDATE public.refunds
         SET status='manual_review',
             failure_reason='insufficient_provider_funds',
             updated_at=now()
       WHERE id = p_refund_id;

      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id, 'refund_manual_review',
             'Refund needs manual review',
             'Refund #' || substring(p_refund_id::text,1,8) || ' — insufficient provider funds',
             jsonb_build_object('refund_id', p_refund_id, 'reason', 'insufficient_provider_funds',
                                'required', v_amount, 'available', v_wallet.balance + COALESCE(v_wallet.held_balance,0))
      FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');

      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_provider_funds',
        'required', v_amount, 'available', v_wallet.balance + COALESCE(v_wallet.held_balance,0));
    END IF;
  END IF;

  -- Apply wallet deduction
  UPDATE public.user_wallets
     SET balance = balance - v_deduct_balance,
         held_balance = COALESCE(held_balance,0) - v_deduct_held,
         total_refunded = COALESCE(total_refunded,0) + v_amount,
         updated_at = now()
   WHERE user_id = v_provider_id;

  -- Update payment_hold
  UPDATE public.payment_holds
     SET status = 'refunded'::payment_hold_status,
         available_amount = GREATEST(0, COALESCE(available_amount,0) - v_deduct_balance),
         held_amount = GREATEST(0, COALESCE(held_amount,0) - v_deduct_held),
         updated_at = now()
   WHERE id = v_hold.id;

  -- Wallet tx (provider deduction)
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, description, status, reference_id, reference_type)
  VALUES
    (v_provider_id, 'refund_deduction', -v_amount,
     'Refund deduction for booking #' || substring(v_refund.booking_id::text,1,8),
     'completed', p_refund_id, 'refund');

  -- Update booking status
  IF v_refund.booking_type = 'service' THEN
    UPDATE public.service_bookings SET status='refunded', updated_at=now()
     WHERE id = v_refund.booking_id;
  ELSE
    UPDATE public.bookings SET status='refunded'
     WHERE id = v_refund.booking_id;
  END IF;

  -- Mark refund completed
  UPDATE public.refunds
     SET status='completed',
         amount = v_amount,
         payment_hold_id = v_hold.id,
         processed_at = now(),
         processed_by = v_caller,
         auto_processed = (v_refund.status IN ('requested','pending','approved')
                            AND p_admin_override_amount IS NULL),
         failure_reason = NULL,
         updated_at = now()
   WHERE id = p_refund_id;

  -- Financial log
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, net_amount, reference_type, reference_id,
     payer_id, receiver_id, status, metadata)
  VALUES
    ('refund_processed', v_amount, v_amount, 'refund', p_refund_id,
     v_provider_id, v_user_id, 'completed',
     jsonb_build_object('booking_id', v_refund.booking_id, 'hold_id', v_hold.id,
                        'deducted_from_balance', v_deduct_balance,
                        'deducted_from_held', v_deduct_held,
                        'processed_by', v_caller));

  -- Notifications
  INSERT INTO public.notifications (user_id, type, title, message, data) VALUES
    (v_user_id, 'refund_completed', 'تم تنفيذ الاسترداد',
     'تم استرداد مبلغ ' || v_amount::text || ' ريال إلى محفظتك.',
     jsonb_build_object('refund_id', p_refund_id, 'amount', v_amount)),
    (v_provider_id, 'refund_deducted', 'تم خصم استرداد',
     'تم خصم ' || v_amount::text || ' ريال من رصيدك (استرداد لحجز).',
     jsonb_build_object('refund_id', p_refund_id, 'amount', v_amount));

  -- Sync hold dispute state
  PERFORM public.sync_hold_dispute_state(v_refund.booking_id);

  RETURN jsonb_build_object('ok', true, 'refund_id', p_refund_id, 'amount', v_amount,
    'deducted_balance', v_deduct_balance, 'deducted_held', v_deduct_held);
END;
$$;

REVOKE ALL ON FUNCTION public.process_refund(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_refund(uuid, numeric) TO authenticated, service_role;

-- 4) request_refund — user-facing entry point
CREATE OR REPLACE FUNCTION public.request_refund(
  p_booking_id uuid,
  p_booking_type text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_eligibility jsonb;
  v_owner uuid;
  v_existing uuid;
  v_refund_id uuid;
  v_pct numeric;
  v_amount numeric;
  v_status text;
  v_auto_process boolean;
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_booking_type NOT IN ('event','service') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_booking_type');
  END IF;

  -- Verify ownership
  IF p_booking_type = 'service' THEN
    SELECT user_id INTO v_owner FROM public.service_bookings WHERE id = p_booking_id;
  ELSE
    SELECT user_id INTO v_owner FROM public.bookings WHERE id = p_booking_id;
  END IF;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF v_owner <> v_caller AND NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Idempotency
  SELECT id INTO v_existing FROM public.refunds
   WHERE booking_id = p_booking_id
     AND status NOT IN ('rejected','failed')
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'refund_already_exists', 'refund_id', v_existing);
  END IF;

  v_eligibility := public.calculate_refund_eligibility(p_booking_id, p_booking_type);
  IF NOT (v_eligibility->>'ok')::boolean THEN
    RETURN v_eligibility;
  END IF;

  v_pct := (v_eligibility->>'eligible_pct')::numeric;
  v_amount := (v_eligibility->>'eligible_amount')::numeric;
  v_auto_process := (v_pct > 0);
  v_status := CASE WHEN v_auto_process THEN 'pending' ELSE 'manual_review' END;

  INSERT INTO public.refunds
    (booking_id, user_id, amount, eligible_amount, eligible_pct, reason,
     status, refund_type, booking_type)
  VALUES
    (p_booking_id, v_owner, v_amount, v_amount, v_pct, p_reason,
     v_status,
     CASE WHEN v_auto_process THEN 'automatic' ELSE 'manual' END,
     p_booking_type)
  RETURNING id INTO v_refund_id;

  -- Notify admins for manual review
  IF NOT v_auto_process THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'refund_manual_review',
           'Refund pending manual review',
           'Refund request requires admin decision',
           jsonb_build_object('refund_id', v_refund_id, 'booking_id', p_booking_id, 'reason', p_reason)
    FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');

    RETURN jsonb_build_object('ok', true, 'refund_id', v_refund_id, 'status', v_status,
      'eligible_pct', v_pct, 'auto_processed', false);
  END IF;

  -- Auto-process
  v_result := public.process_refund(v_refund_id, NULL);
  RETURN jsonb_build_object('ok', true, 'refund_id', v_refund_id,
    'eligible_pct', v_pct, 'auto_processed', true, 'process_result', v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.request_refund(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid,text,text) TO authenticated, service_role;

-- 5) RLS on refunds
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own refunds" ON public.refunds;
CREATE POLICY "Users view their own refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage refunds" ON public.refunds;
CREATE POLICY "Admins manage refunds" ON public.refunds
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
