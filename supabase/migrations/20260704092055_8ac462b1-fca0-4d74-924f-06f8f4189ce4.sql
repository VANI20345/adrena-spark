
-- 1) Expand wallet_transactions.type constraint to include all types used by refund/hold flows
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'credit','debit','commission','refund','withdrawal',
    'release','hold','refund_deduction','refund_credit',
    'negative_balance_recovery','adjustment','bonus'
  ]));

-- 2) Fix group member count trigger to update the physical `public.groups` table (not the view `event_groups`)
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_gid uuid;
  v_count integer;
BEGIN
  v_gid := COALESCE(NEW.group_id, OLD.group_id);
  SELECT COUNT(*) INTO v_count FROM public.group_memberships WHERE group_id = v_gid;
  UPDATE public.groups SET current_members = v_count WHERE id = v_gid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recompute stale counts
UPDATE public.groups g SET current_members = COALESCE(sub.c, 0)
FROM (SELECT group_id, COUNT(*)::int c FROM public.group_memberships GROUP BY group_id) sub
WHERE sub.group_id = g.id;
UPDATE public.groups SET current_members = 0
WHERE id NOT IN (SELECT DISTINCT group_id FROM public.group_memberships);

-- 3) Fix post likes/comments count triggers to update the physical `public.posts` table
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_pid uuid; v_count integer;
BEGIN
  v_pid := COALESCE(NEW.post_id, OLD.post_id);
  SELECT COUNT(*) INTO v_count FROM public.post_reactions WHERE post_id = v_pid;
  UPDATE public.posts SET likes_count = v_count WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_pid uuid; v_count integer;
BEGIN
  v_pid := COALESCE(NEW.post_id, OLD.post_id);
  SELECT COUNT(*) INTO v_count FROM public.comments WHERE post_id = v_pid;
  UPDATE public.posts SET comments_count = v_count WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recompute stale post counters
UPDATE public.posts p SET
  likes_count = COALESCE((SELECT COUNT(*) FROM public.post_reactions r WHERE r.post_id = p.id), 0),
  comments_count = COALESCE((SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id), 0);

-- 4) Fix request_group_join: the FOUND flag was clobbered by the intermediate
-- `select max(created_at) ... into v_last_submit_at from history` query, which
-- always FOUND=true, causing the function to skip the initial insert branch and
-- instead try to UPDATE a non-existent row. Track existence explicitly.
CREATE OR REPLACE FUNCTION public.request_group_join(
  p_group_id uuid,
  p_message text DEFAULT NULL::text,
  p_admission_answers jsonb DEFAULT NULL::jsonb,
  p_cooldown_seconds integer DEFAULT 86400
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_group record;
  v_existing record;
  v_has_existing boolean := false;
  v_is_member boolean;
  v_last_submit_at timestamptz;
  v_next_allowed_at timestamptz;
  v_action text;
  v_now timestamptz := now();
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select id, requires_approval
  into v_group
  from public.groups
  where id = p_group_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'group_not_found');
  end if;

  if coalesce(v_group.requires_approval, false) is false then
    return jsonb_build_object('ok', false, 'code', 'no_approval_required');
  end if;

  select exists(
    select 1
    from public.group_memberships gm
    where gm.group_id = p_group_id
      and gm.user_id = v_user_id
  ) into v_is_member;

  if v_is_member then
    return jsonb_build_object('ok', false, 'code', 'already_member');
  end if;

  select id, status
  into v_existing
  from public.group_join_requests
  where group_id = p_group_id
    and user_id = v_user_id;

  v_has_existing := found;

  if v_has_existing and v_existing.status = 'pending' then
    return jsonb_build_object('ok', true, 'code', 'already_pending', 'status', 'pending', 'request_id', v_existing.id);
  end if;

  select max(created_at)
  into v_last_submit_at
  from public.group_join_request_history h
  where h.group_id = p_group_id
    and h.user_id = v_user_id
    and h.action in ('submitted','resubmitted');

  if v_last_submit_at is not null then
    v_next_allowed_at := v_last_submit_at + make_interval(secs => greatest(0, p_cooldown_seconds));
    if v_now < v_next_allowed_at then
      return jsonb_build_object(
        'ok', false,
        'code', 'cooldown_active',
        'cooldown_seconds', greatest(0, p_cooldown_seconds),
        'next_allowed_at', v_next_allowed_at
      );
    end if;
  end if;

  if not v_has_existing then
    insert into public.group_join_requests (group_id, user_id, status, message, admission_answers, reviewed_at, reviewed_by, created_at)
    values (p_group_id, v_user_id, 'pending', p_message, p_admission_answers, null, null, v_now)
    returning id into v_existing.id;
    v_action := 'submitted';
  else
    if v_existing.status not in ('rejected','approved') then
      return jsonb_build_object('ok', false, 'code', 'invalid_previous_status', 'status', v_existing.status);
    end if;

    update public.group_join_requests
    set status = 'pending',
        message = p_message,
        admission_answers = p_admission_answers,
        reviewed_at = null,
        reviewed_by = null,
        created_at = v_now
    where id = v_existing.id;

    v_action := 'resubmitted';
  end if;

  insert into public.group_join_request_history (request_id, group_id, user_id, action, message, admission_answers, created_at)
  values (v_existing.id, p_group_id, v_user_id, v_action, p_message, p_admission_answers, v_now);

  return jsonb_build_object('ok', true, 'code', v_action, 'status', 'pending', 'request_id', v_existing.id);
end;
$function$;

-- 5) Prevent duplicate reviews per user per event/service
DELETE FROM public.reviews r
USING public.reviews r2
WHERE r.event_id IS NOT NULL AND r.event_id = r2.event_id
  AND r.user_id = r2.user_id AND r.id > r2.id;
DELETE FROM public.reviews r
USING public.reviews r2
WHERE r.service_id IS NOT NULL AND r.service_id = r2.service_id
  AND r.user_id = r2.user_id AND r.id > r2.id;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_event_uniq
  ON public.reviews (user_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_service_uniq
  ON public.reviews (user_id, service_id) WHERE service_id IS NOT NULL;
