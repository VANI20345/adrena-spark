-- Drop the existing policy that requires organizer to also be a group admin
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;

-- Create a new policy that allows group admins to create events for their groups
-- The organizer can be ANY member of the group (not necessarily an admin)
CREATE POLICY "Group admins can create events for their groups" 
ON public.events 
FOR INSERT 
TO public
WITH CHECK (
  -- Event must be for a group
  group_id IS NOT NULL 
  AND
  -- The current user must be an owner or admin of the group
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = events.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role IN ('owner', 'admin')
  )
  AND
  -- The organizer must be a member of the group (any role is fine)
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = events.group_id
    AND group_memberships.user_id = events.organizer_id
  )
);