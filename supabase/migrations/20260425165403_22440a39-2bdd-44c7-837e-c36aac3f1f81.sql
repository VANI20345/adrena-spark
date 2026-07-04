CREATE OR REPLACE FUNCTION public.get_staff_dashboard_stats()
RETURNS TABLE(
  admins bigint,
  super_admins bigint,
  service_providers bigint,
  event_organizers bigint,
  group_leaders bigint,
  total_users bigint,
  admins_percentage numeric,
  users_percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized AS (
    SELECT public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'super_admin'::public.app_role]) AS allowed
  ),
  all_known_users AS (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.user_id IS NOT NULL
    UNION
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.user_id IS NOT NULL
  ),
  role_counts AS (
    SELECT
      COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role = 'admin'::public.app_role) AS admins,
      COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role = 'super_admin'::public.app_role) AS super_admins,
      COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role = 'provider'::public.app_role) AS service_providers
    FROM public.user_roles ur
    INNER JOIN all_known_users aku ON aku.user_id = ur.user_id
  ),
  organizer_counts AS (
    SELECT
      COUNT(DISTINCT e.organizer_id) AS event_organizers
    FROM public.events e
    INNER JOIN all_known_users aku ON aku.user_id = e.organizer_id
  ),
  group_leader_counts AS (
    SELECT
      COUNT(DISTINCT g.created_by) AS group_leaders
    FROM public.groups g
    INNER JOIN all_known_users aku ON aku.user_id = g.created_by
  ),
  totals AS (
    SELECT COUNT(*) AS total_users FROM all_known_users
  )
  SELECT
    CASE WHEN authorized.allowed THEN role_counts.admins ELSE 0 END,
    CASE WHEN authorized.allowed THEN role_counts.super_admins ELSE 0 END,
    CASE WHEN authorized.allowed THEN role_counts.service_providers ELSE 0 END,
    CASE WHEN authorized.allowed THEN organizer_counts.event_organizers ELSE 0 END,
    CASE WHEN authorized.allowed THEN group_leader_counts.group_leaders ELSE 0 END,
    CASE WHEN authorized.allowed THEN totals.total_users ELSE 0 END,
    CASE
      WHEN authorized.allowed AND totals.total_users > 0
      THEN ROUND(((role_counts.admins + role_counts.super_admins)::numeric / totals.total_users::numeric) * 100, 1)
      ELSE 0
    END,
    CASE
      WHEN authorized.allowed AND totals.total_users > 0
      THEN ROUND((100 - (((role_counts.admins + role_counts.super_admins)::numeric / totals.total_users::numeric) * 100)), 1)
      ELSE 0
    END
  FROM authorized, role_counts, organizer_counts, group_leader_counts, totals;
$$;

REVOKE ALL ON FUNCTION public.get_staff_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_dashboard_stats() TO authenticated;