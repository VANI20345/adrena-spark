-- 1. Create helper function for group admin check
CREATE OR REPLACE FUNCTION public.is_group_admin_or_owner(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE group_id = _group_id
      AND user_id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- 2. Create helper function for group membership check
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships
    WHERE group_id = _group_id
      AND user_id = _user_id
  )
$$;

-- 3. Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "Anyone can view approved events" ON public.events;
DROP POLICY IF EXISTS "Organizers can view own events" ON public.events;
DROP POLICY IF EXISTS "Group admins can view group events" ON public.events;
DROP POLICY IF EXISTS "Platform admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Users and group admins can create events" ON public.events;
DROP POLICY IF EXISTS "Organizers can update own events" ON public.events;
DROP POLICY IF EXISTS "Group admins can update group events" ON public.events;
DROP POLICY IF EXISTS "Platform admins can update all events" ON public.events;
DROP POLICY IF EXISTS "Organizers can delete own events" ON public.events;
DROP POLICY IF EXISTS "Group admins can delete group events" ON public.events;
DROP POLICY IF EXISTS "Platform admins can delete all events" ON public.events;
DROP POLICY IF EXISTS "events_select_approved" ON public.events;
DROP POLICY IF EXISTS "events_select_organizer" ON public.events;
DROP POLICY IF EXISTS "events_select_group_admin" ON public.events;
DROP POLICY IF EXISTS "events_select_platform_admin" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_organizer" ON public.events;
DROP POLICY IF EXISTS "events_update_group_admin" ON public.events;
DROP POLICY IF EXISTS "events_update_platform_admin" ON public.events;
DROP POLICY IF EXISTS "events_delete_organizer" ON public.events;
DROP POLICY IF EXISTS "events_delete_group_admin" ON public.events;
DROP POLICY IF EXISTS "events_delete_platform_admin" ON public.events;

-- 4. SELECT Policies
CREATE POLICY "Anyone can view approved events"
ON public.events FOR SELECT
TO public
USING (status IN ('approved', 'active'));

CREATE POLICY "Organizers can view own events"
ON public.events FOR SELECT
TO authenticated
USING (organizer_id = auth.uid());

CREATE POLICY "Group admins can view group events"
ON public.events FOR SELECT
TO authenticated
USING (
  group_id IS NOT NULL 
  AND public.is_group_admin_or_owner(group_id, auth.uid())
);

CREATE POLICY "Platform admins can view all events"
ON public.events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. INSERT Policy
CREATE POLICY "Users and group admins can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (
  -- User creates their own event
  (organizer_id = auth.uid())
  OR
  -- Platform admin can create any event
  (public.has_role(auth.uid(), 'admin'))
  OR
  -- Group admin/owner creates event with group member as organizer
  (
    group_id IS NOT NULL
    AND public.is_group_admin_or_owner(group_id, auth.uid())
    AND public.is_group_member(group_id, organizer_id)
  )
);

-- 6. UPDATE Policies
CREATE POLICY "Organizers can update own events"
ON public.events FOR UPDATE
TO authenticated
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Group admins can update group events"
ON public.events FOR UPDATE
TO authenticated
USING (
  group_id IS NOT NULL 
  AND public.is_group_admin_or_owner(group_id, auth.uid())
)
WITH CHECK (
  group_id IS NOT NULL 
  AND public.is_group_admin_or_owner(group_id, auth.uid())
);

CREATE POLICY "Platform admins can update all events"
ON public.events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. DELETE Policies
CREATE POLICY "Organizers can delete own events"
ON public.events FOR DELETE
TO authenticated
USING (organizer_id = auth.uid());

CREATE POLICY "Group admins can delete group events"
ON public.events FOR DELETE
TO authenticated
USING (
  group_id IS NOT NULL 
  AND public.is_group_admin_or_owner(group_id, auth.uid())
);

CREATE POLICY "Platform admins can delete all events"
ON public.events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));