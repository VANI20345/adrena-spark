-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_group_created ON event_groups;
DROP FUNCTION IF EXISTS setup_group_moderators() CASCADE;

-- Step 2: Make foreign key deferrable (safety net)
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey,
ADD CONSTRAINT group_members_group_id_fkey 
  FOREIGN KEY (group_id) 
  REFERENCES event_groups(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.setup_group_moderators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  -- Insert creator as owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- For event-linked or region groups: add all admins
  IF NEW.event_id IS NOT NULL OR NEW.group_type = 'region' THEN
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
$function$;

-- Step 4: Create AFTER INSERT trigger (KEY CHANGE)
CREATE TRIGGER on_group_created
AFTER INSERT ON event_groups
FOR EACH ROW
EXECUTE FUNCTION setup_group_moderators();

-- Step 5: Update RLS policy to allow SECURITY DEFINER functions
DROP POLICY IF EXISTS "Users can only join event groups they're authorized for" ON group_members;

CREATE POLICY "Users can only join event groups they're authorized for"
ON group_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is the one being added AND meets authorization requirements
  (auth.uid() = user_id AND (
    -- Region groups are open to all
    EXISTS (SELECT 1 FROM event_groups eg WHERE eg.id = group_members.group_id AND eg.group_type = 'region'::text)
    -- Event organizers can join their event groups
    OR EXISTS (SELECT 1 FROM event_groups eg JOIN events e ON eg.event_id = e.id WHERE eg.id = group_members.group_id AND e.organizer_id = auth.uid())
    -- Confirmed attendees can join event groups
    OR EXISTS (SELECT 1 FROM event_groups eg JOIN bookings b ON eg.event_id = b.event_id WHERE eg.id = group_members.group_id AND b.user_id = auth.uid() AND b.status = 'confirmed'::text)
    -- Admins can join any group
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
  ))
);