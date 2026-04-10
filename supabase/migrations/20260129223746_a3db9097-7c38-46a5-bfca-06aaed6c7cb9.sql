-- Fix follow RLS: allow the target user to insert a follow row ONLY when approving an existing follow_request
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (
  auth.uid() = follower_id
  OR (
    auth.uid() = following_id
    AND EXISTS (
      SELECT 1
      FROM public.follow_requests fr
      WHERE fr.requester_id = follower_id
        AND fr.target_id = following_id
        AND fr.status = 'approved'
    )
  )
);

-- Fix group event creation/update RLS: allow group creator (groups.created_by) even if they're not in group_memberships
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;
CREATE POLICY "Group admins can create events for their groups"
ON public.events
FOR INSERT
WITH CHECK (
  (group_id IS NOT NULL)
  AND
  (
    (
      -- Creator path: group owner (groups.created_by) can create events
      (
        EXISTS (
          SELECT 1
          FROM public.groups g
          WHERE g.id = events.group_id
            AND g.created_by = auth.uid()
        )
        OR
        -- Membership path: group admin/owner can create events
        EXISTS (
          SELECT 1
          FROM public.group_memberships gm
          WHERE gm.group_id = events.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
        )
      )
      AND
      -- Organizer must be a group owner/admin (either creator or membership)
      (
        EXISTS (
          SELECT 1
          FROM public.groups g2
          WHERE g2.id = events.group_id
            AND g2.created_by = events.organizer_id
        )
        OR
        EXISTS (
          SELECT 1
          FROM public.group_memberships gm2
          WHERE gm2.group_id = events.group_id
            AND gm2.user_id = events.organizer_id
            AND gm2.role IN ('owner', 'admin')
        )
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

DROP POLICY IF EXISTS "Group admins can update events for their groups" ON public.events;
CREATE POLICY "Group admins can update events for their groups"
ON public.events
FOR UPDATE
USING (
  (group_id IS NOT NULL)
  AND (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = events.group_id
        AND g.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.group_memberships gm
      WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  (group_id IS NOT NULL)
  AND (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = events.group_id
        AND g.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.group_memberships gm
      WHERE gm.group_id = events.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
    )
  )
);