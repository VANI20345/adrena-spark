-- Add equipment column to event_groups table
ALTER TABLE event_groups ADD COLUMN IF NOT EXISTS equipment text[] DEFAULT '{}';

-- Update RLS policy for group_members to allow admin/owner approval
DROP POLICY IF EXISTS "Users can join authorized groups" ON group_members;

CREATE POLICY "Users can join authorized groups" ON group_members
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  AND (
    -- Public groups without approval
    (EXISTS (
      SELECT 1 FROM event_groups eg
      WHERE eg.id = group_members.group_id 
      AND eg.visibility = 'public' 
      AND eg.requires_approval = false
    ))
    -- Event organizers can join their own event groups
    OR (EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN events e ON eg.event_id = e.id
      WHERE eg.id = group_members.group_id 
      AND e.organizer_id = auth.uid()
    ))
    -- Event attendees can join
    OR (EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN bookings b ON eg.event_id = b.event_id
      WHERE eg.id = group_members.group_id 
      AND b.user_id = auth.uid() 
      AND b.status = 'confirmed'
    ))
    -- Admins can join any group
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() 
      AND role = 'admin'
    ))
  )
  -- ADDED: Allow group owners/admins to insert members (for approving join requests)
  OR (EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('admin', 'owner')
  ))
  -- ADDED: Allow group creator to add members
  OR (EXISTS (
    SELECT 1 FROM event_groups eg
    WHERE eg.id = group_members.group_id 
    AND eg.created_by = auth.uid()
  ))
);