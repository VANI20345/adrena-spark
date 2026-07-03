
-- Phase 8.4 — Provider wallet summary RPC (held, available, pending_withdraw + per-hold details)
CREATE OR REPLACE FUNCTION public.get_provider_wallet_summary(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_balance numeric := 0;
  v_held numeric := 0;
  v_pending_withdraw numeric := 0;
  v_holds jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Only allow self or admin/super_admin to view
  IF v_uid <> auth.uid()
     AND NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT COALESCE(balance, 0), COALESCE(held_balance, 0)
  INTO v_balance, v_held
  FROM public.user_wallets WHERE user_id = v_uid;

  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_pending_withdraw
  FROM public.wallet_transactions
  WHERE user_id = v_uid AND type = 'withdraw' AND status = 'pending';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'source_type', source_type,
    'source_id', source_id,
    'gross_amount', gross_amount,
    'available_amount', available_amount,
    'held_amount', held_amount,
    'hold_until', hold_until,
    'review_state', review_state,
    'complaint_extension', complaint_extension,
    'status', status,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_holds
  FROM public.payment_holds
  WHERE provider_id = v_uid AND status = 'held';

  RETURN jsonb_build_object(
    'balance', v_balance,
    'held_balance', v_held,
    'pending_withdraw', v_pending_withdraw,
    'holds', v_holds
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_provider_wallet_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_wallet_summary(uuid) TO authenticated, service_role;
