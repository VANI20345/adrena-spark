-- Drop the old function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.release_payment_hold(uuid, text);

-- Recreate the function to accept p_force and handle self-healing + force release
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
    -- Self-heal: flip review_state back so the row reflects reality
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

  -- 7) Move held_amount → balance in wallet
  IF COALESCE(v_hold.held_amount, 0) > 0 THEN
    INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
    VALUES (v_hold.provider_id, v_hold.held_amount, v_hold.held_amount, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_wallets.balance + EXCLUDED.balance,
          total_earned = public.user_wallets.total_earned + EXCLUDED.balance,
          held_balance = GREATEST(0, public.user_wallets.held_balance - v_hold.held_amount),
          updated_at = now();

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

-- Revoke execute on new signature and grant to proper roles
REVOKE ALL ON FUNCTION public.release_payment_hold(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_payment_hold(uuid, text, boolean) TO authenticated, service_role;

-- Update RLS Policy on public.profiles to allow both admin and super_admin to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.is_super_admin(auth.uid())
);

-- Update request_withdrawal function to remove reserve limit and make full balance withdrawable
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_bank_name text, p_account_holder_name text,
  p_account_number text, p_iban text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wallet RECORD;
  v_min_withdrawal numeric := 100;
  v_available numeric;
  v_ref text;
  v_request_id uuid;
  v_tx_id uuid;
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

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  -- Available = balance (entire amount in the wallet)
  v_available := COALESCE(v_wallet.balance, 0);

  IF p_amount > v_available THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_balance',
      'available', v_available, 'reserve', 0,
      'held_balance', 0
    );
  END IF;

  v_ref := 'WD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substring(v_user_id::text, 1, 8);

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, status, reference_id, reference_type
  ) VALUES (
    v_user_id, 'withdraw', -p_amount,
    'طلب سحب إلى ' || p_bank_name,
    'pending', v_ref, 'withdrawal'
  ) RETURNING id INTO v_tx_id;

  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_name, account_holder_name, account_number, iban,
    reference_number, wallet_transaction_id, status
  ) VALUES (
    v_user_id, p_amount, p_bank_name, p_account_holder_name, p_account_number, p_iban,
    v_ref, v_tx_id, 'pending'
  ) RETURNING id INTO v_request_id;

  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reference', v_ref,
    'request_id', v_request_id,
    'amount', p_amount
  );
END;
$$;

-- Grant execute permission on request_withdrawal
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text, text) TO authenticated;

