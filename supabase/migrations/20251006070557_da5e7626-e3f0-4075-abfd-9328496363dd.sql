-- 1. إنشاء function لإضافة الأدمنز الجدد لجميع المجموعات تلقائياً
CREATE OR REPLACE FUNCTION public.add_new_admin_to_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_record RECORD;
BEGIN
  -- فقط إذا تم تحديث الدور إلى admin
  IF NEW.role = 'admin'::app_role AND (OLD.role IS NULL OR OLD.role != 'admin'::app_role) THEN
    -- إضافة الأدمن الجديد لجميع المجموعات الحالية
    FOR group_record IN (
      SELECT id FROM event_groups 
      WHERE archived_at IS NULL 
      AND (event_id IS NOT NULL OR group_type = 'region')
    ) LOOP
      -- إضافة الأدمن كعضو في المجموعة
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (group_record.id, NEW.user_id, 'admin')
      ON CONFLICT (group_id, user_id) 
      DO UPDATE SET role = 'admin';
      
      -- تحديث admin_group_assignments
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

-- إنشاء trigger لتفعيل الـ function
DROP TRIGGER IF EXISTS on_admin_role_assigned ON public.user_roles;
CREATE TRIGGER on_admin_role_assigned
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.add_new_admin_to_groups();

-- 2. تحديث RLS policies لجدول group_members للسماح بالتحديث التلقائي
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;
CREATE POLICY "Admins can update group members"
ON public.group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
  OR EXISTS (
    SELECT 1 FROM event_groups eg
    WHERE eg.id = group_members.group_id
    AND eg.created_by = auth.uid()
  )
);

-- 3. إصلاح search_path للوظائف الموجودة
DROP FUNCTION IF EXISTS public.update_group_member_count() CASCADE;
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_groups
    SET current_members = current_members + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_groups
    SET current_members = GREATEST(0, current_members - 1)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_group_count_on_member_change
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count();

DROP FUNCTION IF EXISTS public.calculate_auto_delete_date() CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_auto_delete_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER set_auto_delete_date
BEFORE INSERT OR UPDATE ON public.event_groups
FOR EACH ROW
EXECUTE FUNCTION public.calculate_auto_delete_date();