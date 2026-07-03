-- Fix the add_new_admin_to_groups function to use city_id instead of group_type
CREATE OR REPLACE FUNCTION public.add_new_admin_to_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_record RECORD;
BEGIN
  -- Only if role is updated to admin
  IF NEW.role = 'admin'::app_role AND (OLD.role IS NULL OR OLD.role != 'admin'::app_role) THEN
    -- Add new admin to all existing groups
    FOR group_record IN (
      SELECT id FROM event_groups 
      WHERE archived_at IS NULL 
      AND (event_id IS NOT NULL OR city_id IS NOT NULL)
    ) LOOP
      -- Add admin as group member
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (group_record.id, NEW.user_id, 'admin')
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET role = 'admin';
      
      -- Update admin_group_assignments
      INSERT INTO admin_group_assignments (admin_id, group_count)
      VALUES (NEW.user_id, 1)
      ON CONFLICT (admin_id) 
      DO UPDATE SET 
        group_count = admin_group_assignments.group_count + 1,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;