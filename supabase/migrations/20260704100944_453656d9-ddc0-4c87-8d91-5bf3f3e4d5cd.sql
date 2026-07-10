
-- 1) Fix post comments counter to update the correct table (public.posts)
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
       SET comments_count = COALESCE(comments_count, 0) + 1
     WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
       SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
     WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- 2) Fix post likes counter to update the correct table (public.posts)
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
       SET likes_count = COALESCE(likes_count, 0) + 1
     WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
       SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
     WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Backfill existing counts so historical rows are accurate.
UPDATE public.posts p
   SET likes_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT post_id, COUNT(*)::int AS cnt
      FROM public.post_reactions
     GROUP BY post_id
  ) sub
 WHERE p.id = sub.post_id;

UPDATE public.posts p
   SET comments_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT post_id, COUNT(*)::int AS cnt
      FROM public.comments
     GROUP BY post_id
  ) sub
 WHERE p.id = sub.post_id;

-- 3) Fix refund → payment_hold flag trigger to stop referencing NEW.service_booking_id
--    (the refunds table only has booking_id + booking_type discriminator)
CREATE OR REPLACE FUNCTION public.tg_refund_flag_payment_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_ref uuid;
BEGIN
  v_booking_ref := NEW.booking_id;
  IF v_booking_ref IS NULL THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status <> 'pending') THEN
    UPDATE public.payment_holds
       SET complaint_extension = true,
           complaint_reason = 'refund_request:' || NEW.id::text,
           status = CASE WHEN status = 'held' THEN 'under_review'::payment_hold_status ELSE status END,
           updated_at = now()
     WHERE source_id = v_booking_ref
       AND status IN ('held', 'under_review');
  END IF;

  -- Re-open if refund resolved
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'pending'
     AND NEW.status IN ('approved', 'rejected', 'completed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.refunds r2
       WHERE r2.booking_id = v_booking_ref
         AND r2.status = 'pending'
         AND r2.id <> NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.support_tickets st
       WHERE (st.entity_type = 'booking' AND st.entity_id = v_booking_ref)
          OR (st.metadata ? 'booking_id'
              AND (st.metadata->>'booking_id')::uuid = v_booking_ref)
         AND st.status IN ('open', 'in_progress')
    ) THEN
      UPDATE public.payment_holds
         SET complaint_extension = false,
             status = CASE WHEN status = 'under_review' THEN 'held'::payment_hold_status ELSE status END,
             updated_at = now()
       WHERE source_id = v_booking_ref
         AND complaint_extension = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Fix sync_hold_dispute_state: support_tickets has no booking_id column
CREATE OR REPLACE FUNCTION public.sync_hold_dispute_state(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hold record;
  v_has_dispute boolean;
  v_new_review hold_review_state;
  v_new_ext boolean;
  v_log_type text;
BEGIN
  IF p_booking_id IS NULL THEN RETURN; END IF;

  SELECT id, status, review_state, complaint_extension, hold_until, provider_id
    INTO v_hold
  FROM public.payment_holds
   WHERE source_id = p_booking_id
   LIMIT 1;

  IF NOT FOUND OR v_hold.status <> 'held' THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.refunds
     WHERE booking_id = p_booking_id
       AND status IN ('pending', 'processing', 'requested')
  ) OR EXISTS (
    SELECT 1 FROM public.support_tickets
     WHERE status IN ('open', 'replied', 'in_progress', 'pending')
       AND (
         (entity_type = 'booking' AND entity_id = p_booking_id)
         OR (metadata ? 'booking_id'
             AND (metadata->>'booking_id')::uuid = p_booking_id)
       )
  ) INTO v_has_dispute;

  IF v_has_dispute THEN
    v_new_ext := true; v_new_review := 'dispute_hold';
  ELSE
    v_new_ext := false;
    IF v_hold.hold_until <= now() THEN v_new_review := 'ready_for_release';
    ELSE v_new_review := 'pending'; END IF;
  END IF;

  IF v_hold.complaint_extension IS DISTINCT FROM v_new_ext
     OR v_hold.review_state IS DISTINCT FROM v_new_review THEN
    UPDATE public.payment_holds
       SET complaint_extension = v_new_ext,
           review_state = v_new_review,
           updated_at = now()
     WHERE id = v_hold.id;

    IF v_new_review = 'dispute_hold' AND v_hold.review_state <> 'dispute_hold' THEN
      v_log_type := 'dispute_opened';
    ELSIF v_hold.review_state = 'dispute_hold' AND v_new_review <> 'dispute_hold' THEN
      v_log_type := 'dispute_closed';
    ELSE
      v_log_type := NULL;
    END IF;

    IF v_log_type IS NOT NULL THEN
      INSERT INTO public.financial_transaction_logs
        (transaction_type, amount, status, reference_type, reference_id, metadata)
      VALUES
        (v_log_type, 0, 'completed', 'payment_hold', v_hold.id,
         jsonb_build_object('from_review_state', v_hold.review_state,
                            'to_review_state', v_new_review,
                            'booking_id', p_booking_id));

      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id, v_log_type,
             CASE WHEN v_log_type='dispute_opened' THEN 'Hold under dispute' ELSE 'Dispute resolved on hold' END,
             'Payment hold '||substring(v_hold.id::text,1,8)||' → '||v_new_review,
             jsonb_build_object('hold_id', v_hold.id, 'booking_id', p_booking_id, 'review_state', v_new_review)
      FROM public.user_roles ur
     WHERE ur.role IN ('admin', 'super_admin');
    END IF;
  END IF;
END;
$function$;
