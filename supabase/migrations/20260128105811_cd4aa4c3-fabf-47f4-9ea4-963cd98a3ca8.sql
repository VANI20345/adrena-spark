-- Fix group events RLS to allow site admins to assign any admin/provider as organizer
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;

CREATE POLICY "Group admins can create events for their groups"
ON public.events
FOR INSERT
WITH CHECK (
  (group_id IS NOT NULL)
  AND
  (
    -- Standard path: group admin/owner, organizer must be a group member
    (
      EXISTS (
        SELECT 1 FROM group_memberships gm
        WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
      )
      AND EXISTS (
        SELECT 1 FROM group_memberships gm2
        WHERE gm2.group_id = events.group_id
        AND gm2.user_id = events.organizer_id
      )
    )
    OR
    -- Site admin path: can assign any admin/provider as organizer
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND public.has_any_role(organizer_id, ARRAY['admin'::app_role, 'provider'::app_role])
    )
  )
);