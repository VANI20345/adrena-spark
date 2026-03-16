-- Fix pricing_plans RLS policy to allow group admins to insert pricing plans
-- when creating events where they are the group admin but not the organizer

-- Drop existing policies
DROP POLICY IF EXISTS "Organizers can manage their event pricing plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "Admins can manage all pricing plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "Everyone can view pricing plans" ON public.pricing_plans;

-- SELECT: Everyone can view pricing plans
CREATE POLICY "Everyone can view pricing plans"
ON public.pricing_plans FOR SELECT
TO public
USING (true);

-- INSERT: Allow users who can create events to also create pricing plans
-- This includes organizers, platform admins, and group admins
CREATE POLICY "Event creators can insert pricing plans"
ON public.pricing_plans FOR INSERT
TO authenticated
WITH CHECK (
  -- Platform admin can insert any pricing plan
  (public.has_role(auth.uid(), 'admin'))
  OR
  -- User is the event organizer
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.organizer_id = auth.uid()
  )
  OR
  -- User is a group admin/owner of the event's group
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.group_id IS NOT NULL
    AND public.is_group_admin_or_owner(e.group_id, auth.uid())
  )
);

-- UPDATE: Allow organizers and group admins to update pricing plans
CREATE POLICY "Event creators can update pricing plans"
ON public.pricing_plans FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'))
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.organizer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.group_id IS NOT NULL
    AND public.is_group_admin_or_owner(e.group_id, auth.uid())
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'))
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.organizer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.group_id IS NOT NULL
    AND public.is_group_admin_or_owner(e.group_id, auth.uid())
  )
);

-- DELETE: Allow organizers and group admins to delete pricing plans
CREATE POLICY "Event creators can delete pricing plans"
ON public.pricing_plans FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'))
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.organizer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.group_id IS NOT NULL
    AND public.is_group_admin_or_owner(e.group_id, auth.uid())
  )
);