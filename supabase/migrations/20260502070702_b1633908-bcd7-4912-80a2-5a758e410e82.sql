
CREATE OR REPLACE FUNCTION public.get_financial_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'total_payments', COALESCE((SELECT SUM(gross_amount) FROM public.payment_holds), 0),
    'total_platform_revenue', COALESCE((SELECT SUM(platform_fee) FROM public.payment_holds), 0),
    'total_provider_earnings', COALESCE((SELECT SUM(net_amount) FROM public.payment_holds), 0),
    'total_held', COALESCE((SELECT SUM(held_amount) FROM public.payment_holds WHERE status = 'held'), 0),
    'total_available_released', COALESCE((SELECT SUM(available_amount) FROM public.payment_holds), 0),
    'total_released_30', COALESCE((SELECT SUM(held_amount) FROM public.payment_holds WHERE status = 'released'), 0),
    'count_held', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held'),
    'count_pending', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held' AND review_state = 'pending' AND complaint_extension = false),
    'count_under_review', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held' AND (review_state = 'dispute_hold' OR complaint_extension = true)),
    'count_ready', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held' AND review_state = 'ready_for_release' AND complaint_extension = false),
    'count_released', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'released'),
    'total_vat_collected', COALESCE((SELECT SUM(vat_amount) FROM public.payment_holds), 0),
    'pending_withdrawals', COALESCE((SELECT SUM(ABS(amount)) FROM public.wallet_transactions WHERE type = 'withdraw' AND status = 'pending'), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
