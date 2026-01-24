-- 1) Ensure history table exists
create table if not exists public.group_join_request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null references public.group_join_requests(id) on delete set null,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('submitted','resubmitted','approved','rejected','cancelled','left_group')),
  message text null,
  admission_answers jsonb null,
  created_at timestamptz not null default now()
);

alter table public.group_join_request_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='group_join_request_history'
      and policyname='Users can view their own join request history'
  ) then
    execute 'create policy "Users can view their own join request history"
             on public.group_join_request_history
             for select
             to authenticated
             using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='group_join_request_history'
      and policyname='Group admins can view join request history'
  ) then
    execute 'create policy "Group admins can view join request history"
             on public.group_join_request_history
             for select
             to authenticated
             using (exists (
               select 1
               from public.group_memberships gm
               where gm.group_id = group_join_request_history.group_id
                 and gm.user_id = auth.uid()
                 and gm.role in (''admin'',''owner'')
             ))';
  end if;
end $$;

-- 2) RPC: request_group_join (security definer)
create or replace function public.request_group_join(
  p_group_id uuid,
  p_message text default null,
  p_admission_answers jsonb default null,
  p_cooldown_seconds int default 86400
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_group record;
  v_existing record;
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

  if found and v_existing.status = 'pending' then
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

  if not found then
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
$$;

grant execute on function public.request_group_join(uuid, text, jsonb, int) to authenticated;
