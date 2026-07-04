
CREATE OR REPLACE FUNCTION public.release_payment_hold(
  p_hold_id uuid,
  p_notes text DEFAULT NULL
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

  -- 3) Status must be 'held' AND review_state = 'ready_for_release'
  IF v_hold.status <> 'held' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'current_status', v_hold.status);
  END IF;

  IF v_hold.review_state <> 'ready_for_release' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_ready_for_release', 'review_state', v_hold.review_state);
  END IF;

  -- 4) complaint_extension must be false
  IF v_hold.complaint_extension THEN
    RETURN jsonb_build_object('ok', false, 'error', 'complaint_active');
  END IF;

  -- 5) Defense-in-depth: re-check no open refund/ticket exists right now
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

  IF v_has_open_dispute THEN
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
        'notes', p_notes
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

-- Lock down execution: only admins/super_admins via authenticated, and service_role
REVOKE ALL ON FUNCTION public.release_payment_hold(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_payment_hold(uuid, text) TO authenticated, service_role;
