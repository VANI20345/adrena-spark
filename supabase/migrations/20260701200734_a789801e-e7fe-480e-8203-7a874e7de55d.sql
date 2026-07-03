
-- 1) Allow visitors (anon) to preview ALL non-archived groups (both public and private).
--    Card-level UI already gates private-group content behind membership; the previous
--    policy restricted anon to visibility='public' which caused visitors to see far
--    fewer group cards than expected.
DROP POLICY IF EXISTS "Anonymous can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Anonymous can view all groups" ON public.groups;
CREATE POLICY "Anonymous can view all groups"
  ON public.groups
  FOR SELECT
  TO anon
  USING (archived_at IS NULL);

-- 2) Clean up the accidental "test" policy on group_memberships and ensure anon can
--    read memberships of any non-archived group so member counts render correctly.
DROP POLICY IF EXISTS "test" ON public.group_memberships;
DROP POLICY IF EXISTS "Anonymous can view group members of all groups" ON public.group_memberships;
CREATE POLICY "Anonymous can view group members of all groups"
  ON public.group_memberships
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND g.archived_at IS NULL
    )
  );

-- 3) Ensure feature_toggles row is readable by everyone (idempotent safety net).
INSERT INTO public.system_settings (key, value)
SELECT 'feature_toggles',
       '{"groups":true,"services":true,"trainings":true,"discounts":true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_settings WHERE key = 'feature_toggles'
);
