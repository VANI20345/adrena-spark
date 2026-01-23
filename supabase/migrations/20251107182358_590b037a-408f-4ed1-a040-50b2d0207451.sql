-- Step 1: Complete data migration - update all remaining 'organizer' roles to 'attendee'
UPDATE user_roles 
SET role = 'attendee'::app_role 
WHERE role = 'organizer'::app_role;

-- Step 2: Drop old RLS policy that references organizers
DROP POLICY IF EXISTS "Organizers can manage event groups" ON event_groups;

-- Step 3: Create new RLS policies for event_groups

-- Policy 1: Allow attendees to create regional groups
CREATE POLICY "Attendees can create regional groups"
ON event_groups
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be creating a regional group (no event_id)
  group_type = 'region' 
  AND event_id IS NULL
  AND created_by = auth.uid()
  -- Verify user is an attendee or admin
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('attendee'::app_role, 'admin'::app_role)
  )
);

-- Policy 2: Allow event creators to create event-linked groups
CREATE POLICY "Event creators can create event groups"
ON event_groups
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be linked to an event
  event_id IS NOT NULL
  AND created_by = auth.uid()
  -- User must be the event creator
  AND EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_groups.event_id 
    AND organizer_id = auth.uid()
  )
);

-- Policy 3: Allow creators and admins to update their groups
CREATE POLICY "Creators and admins can update groups"
ON event_groups
FOR UPDATE
TO authenticated
USING (
  -- Group creator
  created_by = auth.uid()
  OR
  -- Or admin user
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Policy 4: Allow creators and admins to delete groups
CREATE POLICY "Creators and admins can delete groups"
ON event_groups
FOR DELETE
TO authenticated
USING (
  -- Group creator
  created_by = auth.uid()
  OR
  -- Or admin user
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);