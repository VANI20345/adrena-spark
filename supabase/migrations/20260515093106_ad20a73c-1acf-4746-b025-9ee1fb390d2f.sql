ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'expired'::text]));

CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_payments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.payments
       SET status = 'expired'
     WHERE status = 'pending'
       AND created_at < now() - interval '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.payments p2
          WHERE p2.booking_id = payments.booking_id
            AND p2.status = 'completed'
       )
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  IF v_count > 0 THEN
    INSERT INTO public.system_logs (level, message, details)
    VALUES ('INFO',
            'cleanup_stale_pending_payments: marked ' || v_count || ' stale pending payments as expired',
            jsonb_build_object('count', v_count, 'cutoff', (now() - interval '24 hours')::text));
  END IF;

  RETURN jsonb_build_object('ok', true, 'expired', v_count);
END;
$$;

SELECT public.cleanup_stale_pending_payments();