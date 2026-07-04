
-- 1) Enum + column
DO $$ BEGIN
  CREATE TYPE public.hold_review_state AS ENUM ('pending','ready_for_release','dispute_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payment_holds
  ADD COLUMN IF NOT EXISTS review_state public.hold_review_state NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_holds_review
  ON public.payment_holds (status, review_state, complaint_extension, hold_until);

-- 2) Sync function: complaint_extension is the SOLE dispute lock
CREATE OR REPLACE FUNCTION public.sync_hold_dispute_state(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold record;
  v_has_dispute boolean;
  v_new_review hold_review_state;
  v_new_ext boolean;
BEGIN
  IF p_booking_id IS NULL THEN RETURN; END IF;

  SELECT id, status, review_state, complaint_extension, hold_until, provider_id
    INTO v_hold
  FROM public.payment_holds
  WHERE source_id = p_booking_id
  LIMIT 1;

  IF NOT FOUND OR v_hold.status <> 'held' THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.refunds
    WHERE booking_id = p_booking_id
      AND status IN ('pending','processing','requested')
  ) OR EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE entity_type IN ('booking','service_booking','event_booking')
      AND entity_id = p_booking_id
      AND status IN ('open','replied','in_progress','pending')
  ) INTO v_has_dispute;

  IF v_has_dispute THEN
    v_new_ext := true;
    v_new_review := 'dispute_hold';
  ELSE
    v_new_ext := false;
    IF v_hold.hold_until <= now() THEN
      v_new_review := 'ready_for_release';
    ELSE
      v_new_review := 'pending';
    END IF;
  END IF;

  IF v_hold.complaint_extension IS DISTINCT FROM v_new_ext
     OR v_hold.review_state IS DISTINCT FROM v_new_review THEN
    UPDATE public.payment_holds
       SET complaint_extension = v_new_ext,
           review_state = v_new_review,
           updated_at = now()
     WHERE id = v_hold.id;

    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, status, reference_type, reference_id, metadata
    ) VALUES (
      'hold_dispute_state_changed', 0, 'completed',
      'payment_hold', v_hold.id,
      jsonb_build_object(
        'from_review_state', v_hold.review_state,
        'to_review_state', v_new_review,
        'from_complaint_extension', v_hold.complaint_extension,
        'to_complaint_extension', v_new_ext,
        'booking_id', p_booking_id
      )
    );

    IF (v_new_review = 'dispute_hold' AND v_hold.review_state <> 'dispute_hold')
       OR (v_hold.review_state = 'dispute_hold' AND v_new_review <> 'dispute_hold') THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id,
             'hold_dispute_state_changed',
             CASE WHEN v_new_review = 'dispute_hold'
                  THEN 'Hold under dispute' ELSE 'Dispute resolved on hold' END,
             'Payment hold ' || substring(v_hold.id::text,1,8) || ' → ' || v_new_review,
             jsonb_build_object('hold_id', v_hold.id, 'booking_id', p_booking_id, 'review_state', v_new_review)
      FROM public.user_roles ur
      WHERE ur.role IN ('admin','super_admin');
    END IF;
  END IF;
END;
$$;

-- 3) Triggers
CREATE OR REPLACE FUNCTION public.trg_refunds_sync_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sync_hold_dispute_state(COALESCE(NEW.booking_id, OLD.booking_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS refunds_sync_hold ON public.refunds;
CREATE TRIGGER refunds_sync_hold
AFTER INSERT OR UPDATE OF status ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.trg_refunds_sync_hold();

CREATE OR REPLACE FUNCTION public.trg_tickets_sync_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.entity_type, OLD.entity_type) IN ('booking','service_booking','event_booking') THEN
    PERFORM public.sync_hold_dispute_state(COALESCE(NEW.entity_id, OLD.entity_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS tickets_sync_hold ON public.support_tickets;
CREATE TRIGGER tickets_sync_hold
AFTER INSERT OR UPDATE OF status, entity_type, entity_id ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.trg_tickets_sync_hold();

-- 4) Cron worker function
CREATE OR REPLACE FUNCTION public.mark_holds_ready_for_review()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    UPDATE public.payment_holds
       SET review_state = 'ready_for_release', updated_at = now()
     WHERE status = 'held'
       AND review_state = 'pending'
       AND complaint_extension = false
       AND hold_until <= now()
    RETURNING id, provider_id, source_id
  LOOP
    v_count := v_count + 1;

    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, status, reference_type, reference_id, receiver_id, metadata
    ) VALUES (
      'hold_ready_for_review', 0, 'completed',
      'payment_hold', r.id, r.provider_id,
      jsonb_build_object('hold_id', r.id, 'booking_id', r.source_id)
    );

    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT ur.user_id,
           'hold_ready_for_review',
           'Hold ready for release',
           'Payment hold ' || substring(r.id::text,1,8) || ' is ready to release',
           jsonb_build_object('hold_id', r.id, 'booking_id', r.source_id, 'provider_id', r.provider_id)
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','super_admin');
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'marked_count', v_count, 'ran_at', now());
END;
$$;

-- 5) Lock down execution
REVOKE ALL ON FUNCTION public.sync_hold_dispute_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_holds_ready_for_review() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_hold_dispute_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_holds_ready_for_review() TO service_role;

-- 6) Backfill review_state for existing held rows
UPDATE public.payment_holds
   SET review_state = CASE
     WHEN complaint_extension THEN 'dispute_hold'::hold_review_state
     WHEN hold_until <= now() THEN 'ready_for_release'::hold_review_state
     ELSE 'pending'::hold_review_state
   END
 WHERE status = 'held';
