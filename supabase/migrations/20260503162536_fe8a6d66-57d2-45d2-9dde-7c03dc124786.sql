
-- =============================================
-- PHASE 6: WITHDRAWAL / PAYOUT SYSTEM
-- =============================================

-- 1) Status enum
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM (
    'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 100),
  currency TEXT NOT NULL DEFAULT 'SAR',
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  reference_number TEXT NOT NULL UNIQUE,
  wallet_transaction_id UUID,
  admin_notes TEXT,
  rejection_reason TEXT,
  external_transfer_ref TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created ON public.withdrawal_requests(created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "users_view_own_withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[])
  );

DROP POLICY IF EXISTS "admins_manage_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "admins_manage_withdrawals" ON public.withdrawal_requests
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- Inserts and user-side cancels go through SECURITY DEFINER RPCs

-- 4) Update available balance to deduct pending withdrawals
CREATE OR REPLACE FUNCTION public.get_provider_available_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_pending_withdrawals NUMERIC := 0;
BEGIN
  SELECT balance, held_balance, total_earned, total_withdrawn, pending_earnings
  INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'balance', 0, 'held_balance', 0,
      'available_for_withdrawal', 0, 'pending_withdrawals', 0
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id
    AND status IN ('pending', 'approved', 'processing');

  RETURN jsonb_build_object(
    'balance', COALESCE(v_wallet.balance, 0),
    'held_balance', COALESCE(v_wallet.held_balance, 0),
    'pending_earnings', COALESCE(v_wallet.pending_earnings, 0),
    'pending_withdrawals', v_pending_withdrawals,
    'total_earned', COALESCE(v_wallet.total_earned, 0),
    'total_withdrawn', COALESCE(v_wallet.total_withdrawn, 0),
    'available_for_withdrawal', GREATEST(0, COALESCE(v_wallet.balance, 0))
  );
END;
$$;

-- 5) request_withdrawal RPC (atomic)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_bank_name TEXT,
  p_account_holder_name TEXT,
  p_account_number TEXT,
  p_iban TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_min_reserve NUMERIC := 50;
  v_min_withdrawal NUMERIC := 100;
  v_max_allowed NUMERIC;
  v_ref TEXT;
  v_request_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount < v_min_withdrawal THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount_below_minimum', 'minimum', v_min_withdrawal);
  END IF;

  IF p_bank_name IS NULL OR p_account_holder_name IS NULL OR p_account_number IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_bank_details');
  END IF;

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  v_max_allowed := GREATEST(0, COALESCE(v_wallet.balance, 0) - v_min_reserve);
  IF p_amount > v_max_allowed THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_balance',
      'available', v_max_allowed, 'reserve', v_min_reserve
    );
  END IF;

  v_ref := 'WD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substring(v_user_id::text, 1, 8);

  -- Create wallet transaction (pending, negative amount)
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, status, reference_id, reference_type
  ) VALUES (
    v_user_id, 'withdraw', -p_amount,
    'طلب سحب إلى ' || p_bank_name,
    'pending', v_ref, 'withdrawal'
  ) RETURNING id INTO v_tx_id;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_name, account_holder_name, account_number, iban,
    reference_number, wallet_transaction_id, status
  ) VALUES (
    v_user_id, p_amount, p_bank_name, p_account_holder_name, p_account_number, p_iban,
    v_ref, v_tx_id, 'pending'
  ) RETURNING id INTO v_request_id;

  -- Move funds: balance -> pending_earnings (lock them)
  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Financial log
  INSERT INTO public.financial_transaction_logs (
    transaction_type, amount, reference_type, reference_id,
    payer_id, receiver_id, status, metadata
  ) VALUES (
    'withdrawal_requested', p_amount, 'withdrawal', v_request_id,
    NULL, v_user_id, 'pending',
    jsonb_build_object(
      'reference', v_ref, 'bank_name', p_bank_name,
      'account_last4', right(p_account_number, 4),
      'iban_last4', CASE WHEN p_iban IS NOT NULL THEN right(p_iban, 4) ELSE NULL END
    )
  );

  -- Notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id, 'withdrawal_requested',
    'تم استلام طلب السحب',
    'سيتم مراجعة طلب سحب ' || p_amount || ' ريال خلال 2-5 أيام عمل',
    jsonb_build_object('amount', p_amount, 'reference', v_ref, 'request_id', v_request_id)
  );

  RETURN jsonb_build_object(
    'ok', true, 'request_id', v_request_id,
    'reference', v_ref, 'amount', p_amount
  );
END;
$$;

-- 6) admin_process_withdrawal RPC
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_request_id UUID,
  p_action TEXT, -- 'approve' | 'reject' | 'complete'
  p_notes TEXT DEFAULT NULL,
  p_transfer_ref TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin UUID;
  v_req RECORD;
BEGIN
  v_admin := auth.uid();
  IF NOT public.has_any_role(v_admin, ARRAY['admin','super_admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF p_action = 'approve' THEN
    IF v_req.status <> 'pending' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_state', 'current', v_req.status);
    END IF;
    UPDATE public.withdrawal_requests
    SET status = 'approved', admin_notes = p_notes,
        processed_by = v_admin, processed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_req.user_id, 'withdrawal_approved',
            'تمت الموافقة على طلب السحب',
            'تمت الموافقة على سحب ' || v_req.amount || ' ريال وسيتم التحويل قريباً',
            jsonb_build_object('request_id', p_request_id, 'amount', v_req.amount));

  ELSIF p_action = 'complete' THEN
    IF v_req.status NOT IN ('approved', 'processing') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_state', 'current', v_req.status);
    END IF;

    UPDATE public.withdrawal_requests
    SET status = 'completed', external_transfer_ref = p_transfer_ref,
        admin_notes = COALESCE(p_notes, admin_notes),
        completed_at = now()
    WHERE id = p_request_id;

    -- Confirm wallet transaction & finalize
    UPDATE public.wallet_transactions
    SET status = 'completed'
    WHERE id = v_req.wallet_transaction_id;

    -- Release the locked pending_earnings & increment total_withdrawn
    UPDATE public.user_wallets
    SET pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_req.amount),
        total_withdrawn = COALESCE(total_withdrawn, 0) + v_req.amount,
        updated_at = now()
    WHERE user_id = v_req.user_id;

    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, reference_type, reference_id,
      payer_id, receiver_id, status, metadata
    ) VALUES (
      'withdrawal_completed', v_req.amount, 'withdrawal', p_request_id,
      NULL, v_req.user_id, 'completed',
      jsonb_build_object('transfer_ref', p_transfer_ref, 'admin_id', v_admin)
    );

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_req.user_id, 'withdrawal_completed',
            'تم تحويل المبلغ بنجاح',
            'تم تحويل ' || v_req.amount || ' ريال إلى حسابك البنكي',
            jsonb_build_object('request_id', p_request_id, 'amount', v_req.amount, 'transfer_ref', p_transfer_ref));

  ELSIF p_action = 'reject' THEN
    IF v_req.status NOT IN ('pending', 'approved') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_state', 'current', v_req.status);
    END IF;

    UPDATE public.withdrawal_requests
    SET status = 'rejected', rejection_reason = p_notes,
        processed_by = v_admin, processed_at = now()
    WHERE id = p_request_id;

    -- Refund: pending_earnings -> balance
    UPDATE public.user_wallets
    SET pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_req.amount),
        balance = COALESCE(balance, 0) + v_req.amount,
        updated_at = now()
    WHERE user_id = v_req.user_id;

    UPDATE public.wallet_transactions
    SET status = 'failed', description = description || ' (مرفوض: ' || COALESCE(p_notes, '') || ')'
    WHERE id = v_req.wallet_transaction_id;

    -- Refund credit transaction
    INSERT INTO public.wallet_transactions (
      user_id, type, amount, description, status, reference_id, reference_type
    ) VALUES (
      v_req.user_id, 'refund', v_req.amount,
      'استرجاع مبلغ سحب مرفوض - ' || v_req.reference_number,
      'completed', v_req.reference_number, 'withdrawal_refund'
    );

    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, reference_type, reference_id,
      payer_id, receiver_id, status, metadata
    ) VALUES (
      'withdrawal_rejected', v_req.amount, 'withdrawal', p_request_id,
      NULL, v_req.user_id, 'completed',
      jsonb_build_object('reason', p_notes, 'admin_id', v_admin)
    );

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_req.user_id, 'withdrawal_rejected',
            'تم رفض طلب السحب',
            'تم رفض طلب السحب وإعادة المبلغ إلى محفظتك. السبب: ' || COALESCE(p_notes, 'غير محدد'),
            jsonb_build_object('request_id', p_request_id, 'amount', v_req.amount, 'reason', p_notes));
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', p_request_id, 'action', p_action);
END;
$$;

-- 7) cancel_withdrawal_request RPC (user-side)
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_request(p_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID;
  v_req RECORD;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests
  WHERE id = p_request_id AND user_id = v_user FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_forbidden');
  END IF;
  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_cancel', 'current', v_req.status);
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'cancelled', processed_at = now()
  WHERE id = p_request_id;

  -- Refund locked funds back to balance
  UPDATE public.user_wallets
  SET pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_req.amount),
      balance = COALESCE(balance, 0) + v_req.amount,
      updated_at = now()
  WHERE user_id = v_user;

  UPDATE public.wallet_transactions SET status = 'cancelled'
  WHERE id = v_req.wallet_transaction_id;

  INSERT INTO public.financial_transaction_logs (
    transaction_type, amount, reference_type, reference_id,
    payer_id, receiver_id, status, metadata
  ) VALUES (
    'withdrawal_cancelled', v_req.amount, 'withdrawal', p_request_id,
    NULL, v_user, 'completed', jsonb_build_object('cancelled_by', 'user')
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 8) Admin summary
CREATE OR REPLACE FUNCTION public.get_withdrawal_requests_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    'approved_count', COUNT(*) FILTER (WHERE status = 'approved'),
    'approved_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
    'completed_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
    'rejected_count', COUNT(*) FILTER (WHERE status = 'rejected')
  ) INTO v_result
  FROM public.withdrawal_requests;

  RETURN v_result;
END;
$$;
