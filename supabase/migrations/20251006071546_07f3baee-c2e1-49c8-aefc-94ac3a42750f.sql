-- إصلاح trigger setup_group_moderators لدعم المجموعات الإقليمية
-- حذف الـ trigger أولاً ثم الـ function
DROP TRIGGER IF EXISTS on_group_created ON event_groups;
DROP TRIGGER IF EXISTS setup_group_moderators_trigger ON event_groups;
DROP FUNCTION IF EXISTS setup_group_moderators() CASCADE;

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
  -- تعيين المنشئ كـ owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- للمجموعات المرتبطة بفعالية أو مجموعات المناطق: إضافة جميع الأدمنز
  IF NEW.event_id IS NOT NULL OR NEW.group_type = 'region' THEN
    -- إضافة جميع الأدمنز كمشرفين بدور "admin"
    FOR admin_record IN (
      SELECT user_id 
      FROM user_roles 
      WHERE role = 'admin'::app_role
      AND user_id != NEW.created_by -- تجنب التكرار
      ORDER BY created_at ASC
    ) LOOP
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (NEW.id, admin_record.user_id, 'admin')
      ON CONFLICT (group_id, user_id) DO NOTHING;
      
      admin_count := admin_count + 1;
      
      -- تحديث admin_group_assignments
      INSERT INTO admin_group_assignments (admin_id, group_count)
      VALUES (admin_record.user_id, 1)
      ON CONFLICT (admin_id) DO UPDATE
      SET group_count = admin_group_assignments.group_count + 1,
          updated_at = now();
    END LOOP;
    
    -- تسجيل أول أدمن فقط في assigned_admin_id
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

-- إعادة إنشاء الـ trigger
CREATE TRIGGER on_group_created
BEFORE INSERT ON event_groups
FOR EACH ROW
EXECUTE FUNCTION setup_group_moderators();

-- تحديث جميع مجموعات المناطق الموجودة لإضافة الأدمنز
DO $$
DECLARE
  region_group RECORD;
  admin_record RECORD;
BEGIN
  -- لكل مجموعة منطقة موجودة
  FOR region_group IN 
    SELECT id, created_by 
    FROM event_groups 
    WHERE group_type = 'region'
  LOOP
    -- إضافة جميع الأدمنز كمشرفين
    FOR admin_record IN 
      SELECT user_id 
      FROM user_roles 
      WHERE role = 'admin'::app_role
      AND user_id != region_group.created_by
    LOOP
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (region_group.id, admin_record.user_id, 'admin')
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET role = 'admin';
      
      -- تحديث admin_group_assignments
      INSERT INTO admin_group_assignments (admin_id, group_count)
      VALUES (admin_record.user_id, 1)
      ON CONFLICT (admin_id) 
      DO UPDATE SET 
        group_count = admin_group_assignments.group_count + 1,
        updated_at = now();
    END LOOP;
  END LOOP;
END $$;