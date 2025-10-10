-- ========================================
-- تطوير نظام المجموعات الشامل
-- ========================================

-- 1. إضافة حقول جديدة لجدول event_groups
ALTER TABLE public.event_groups
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id);

-- 2. إنشاء جدول لتتبع تعيينات الأدمن للمجموعات (Load Balancing)
CREATE TABLE IF NOT EXISTS public.admin_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE public.admin_group_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_group_assignments
CREATE POLICY "Only admins can view admin assignments"
ON public.admin_group_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Only admins can manage admin assignments"
ON public.admin_group_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 3. إضافة أدوار جديدة لأعضاء المجموعة
ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE public.group_members
ADD CONSTRAINT group_members_role_check
CHECK (role IN ('owner', 'moderator', 'admin', 'member'));

-- 4. إنشاء دالة لتعيين أدمن للمجموعة (Load Balancing)
CREATE OR REPLACE FUNCTION public.assign_admin_to_group()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_admin_id UUID;
BEGIN
  -- البحث عن أدمن بأقل عدد مجموعات
  SELECT admin_id INTO selected_admin_id
  FROM admin_group_assignments
  ORDER BY group_count ASC, created_at ASC
  LIMIT 1;
  
  -- إذا لم يوجد أدمن مسجل، نختار أول أدمن من user_roles
  IF selected_admin_id IS NULL THEN
    SELECT user_id INTO selected_admin_id
    FROM user_roles
    WHERE role = 'admin'
    LIMIT 1;
    
    -- تسجيل الأدمن في جدول التعيينات
    IF selected_admin_id IS NOT NULL THEN
      INSERT INTO admin_group_assignments (admin_id, group_count)
      VALUES (selected_admin_id, 1)
      ON CONFLICT (admin_id) DO UPDATE
      SET group_count = admin_group_assignments.group_count + 1,
          updated_at = now();
    END IF;
  ELSE
    -- زيادة عداد المجموعات للأدمن
    UPDATE admin_group_assignments
    SET group_count = group_count + 1,
        updated_at = now()
    WHERE admin_id = selected_admin_id;
  END IF;
  
  RETURN selected_admin_id;
END;
$$;

-- 5. إنشاء trigger لتعيين المشرفين تلقائياً عند إنشاء مجموعة
CREATE OR REPLACE FUNCTION public.setup_group_moderators()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_admin UUID;
BEGIN
  -- تعيين صاحب المجموعة كـ owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  
  -- تعيين أدمن كمشرف ثانٍ (فقط للمجموعات المرتبطة بفعالية)
  IF NEW.event_id IS NOT NULL THEN
    assigned_admin := assign_admin_to_group();
    
    IF assigned_admin IS NOT NULL THEN
      -- حفظ الأدمن المعين في حقل assigned_admin_id
      NEW.assigned_admin_id := assigned_admin;
      
      -- إضافة الأدمن كمشرف في المجموعة
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (NEW.id, assigned_admin, 'admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_group_created ON public.event_groups;
CREATE TRIGGER on_group_created
BEFORE INSERT ON public.event_groups
FOR EACH ROW
EXECUTE FUNCTION public.setup_group_moderators();

-- 6. إنشاء دالة لتقليل عداد المجموعات عند الحذف
CREATE OR REPLACE FUNCTION public.decrease_admin_group_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تقليل عداد المجموعات للأدمن المعين
  IF OLD.assigned_admin_id IS NOT NULL THEN
    UPDATE admin_group_assignments
    SET group_count = GREATEST(0, group_count - 1),
        updated_at = now()
    WHERE admin_id = OLD.assigned_admin_id;
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_group_deleted ON public.event_groups;
CREATE TRIGGER on_group_deleted
AFTER DELETE ON public.event_groups
FOR EACH ROW
EXECUTE FUNCTION public.decrease_admin_group_count();

-- 7. إنشاء دالة لحساب تاريخ الحذف التلقائي
CREATE OR REPLACE FUNCTION public.calculate_auto_delete_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- إذا كانت المجموعة مرتبطة بفعالية
  IF NEW.event_id IS NOT NULL THEN
    -- جلب تاريخ انتهاء الفعالية
    SELECT end_date + INTERVAL '7 days' INTO NEW.auto_delete_at
    FROM events
    WHERE id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_auto_delete_date ON public.event_groups;
CREATE TRIGGER set_auto_delete_date
BEFORE INSERT OR UPDATE ON public.event_groups
FOR EACH ROW
EXECUTE FUNCTION public.calculate_auto_delete_date();

-- 8. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_event_groups_archived ON event_groups(archived_at);
CREATE INDEX IF NOT EXISTS idx_event_groups_auto_delete ON event_groups(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_event_groups_assigned_admin ON event_groups(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- 9. تحديث سياسات RLS للمجموعات الإقليمية
DROP POLICY IF EXISTS "Regional groups viewable by everyone" ON regional_groups;
CREATE POLICY "Regional groups viewable by everyone"
ON public.regional_groups
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage regional groups" ON regional_groups;
CREATE POLICY "Admins can manage regional groups"
ON public.regional_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);