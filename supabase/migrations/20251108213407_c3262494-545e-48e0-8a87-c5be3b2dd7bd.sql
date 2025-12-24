-- Step 1: Drop policies that depend on group_type
DROP POLICY IF EXISTS "Attendees can create regional groups" ON event_groups;
DROP POLICY IF EXISTS "Event creators can create event groups" ON event_groups;
DROP POLICY IF EXISTS "Users can join authorized groups" ON group_members;

-- Step 2: Drop the problematic constraints
ALTER TABLE event_groups 
DROP CONSTRAINT IF EXISTS event_groups_event_id_required_for_events;

ALTER TABLE event_groups 
DROP CONSTRAINT IF EXISTS event_groups_region_no_event;

-- Step 3: Drop group_type column now that dependencies are removed
ALTER TABLE event_groups 
DROP COLUMN IF EXISTS group_type CASCADE;

-- Step 4: Create new unified policy for attendees to create groups
CREATE POLICY "Attendees can create groups" ON event_groups
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('attendee', 'admin')
  )
);

-- Step 5: Recreate group_members policy without group_type dependency
CREATE POLICY "Users can join authorized groups" ON group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (
    -- Can join public groups without approval
    EXISTS (
      SELECT 1 FROM event_groups eg
      WHERE eg.id = group_members.group_id 
      AND eg.visibility = 'public' 
      AND eg.requires_approval = false
    ) OR
    -- Event organizers can add themselves
    EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN events e ON eg.event_id = e.id
      WHERE eg.id = group_members.group_id 
      AND e.organizer_id = auth.uid()
    ) OR
    -- Users with confirmed bookings can join event groups
    EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN bookings b ON eg.event_id = b.event_id
      WHERE eg.id = group_members.group_id 
      AND b.user_id = auth.uid() 
      AND b.status = 'confirmed'
    ) OR
    -- Admins can join any group
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

-- Step 6: Update the setup_group_moderators function
CREATE OR REPLACE FUNCTION public.setup_group_moderators()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  -- Insert creator as owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- For event-linked groups: add all admins
  IF NEW.event_id IS NOT NULL THEN
    FOR admin_record IN (
      SELECT user_id 
      FROM user_roles 
      WHERE role = 'admin'::app_role
      AND user_id != NEW.created_by
      ORDER BY created_at ASC
    ) LOOP
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (NEW.id, admin_record.user_id, 'admin')
      ON CONFLICT (group_id, user_id) DO NOTHING;
      
      admin_count := admin_count + 1;
      
      -- Update admin_group_assignments
      INSERT INTO admin_group_assignments (admin_id, group_count)
      VALUES (admin_record.user_id, 1)
      ON CONFLICT (admin_id) DO UPDATE
      SET group_count = admin_group_assignments.group_count + 1,
          updated_at = now();
    END LOOP;
    
    -- Record first admin in assigned_admin_id
    IF admin_count > 0 THEN
      SELECT user_id INTO NEW.assigned_admin_id
      FROM user_roles
      WHERE role = 'admin'::app_role
      AND user_id != NEW.created_by
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 7: Update calculate_auto_delete_date function
CREATE OR REPLACE FUNCTION public.calculate_auto_delete_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT end_date + INTERVAL '7 days' INTO NEW.auto_delete_at
    FROM events
    WHERE id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;