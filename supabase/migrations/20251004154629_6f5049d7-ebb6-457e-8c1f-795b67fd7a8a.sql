-- ===================================
-- إصلاح شامل لنظام المجموعات
-- ===================================

-- 1. تحديث سياسات RLS لجدول event_groups للسماح برؤية جميع المجموعات
DROP POLICY IF EXISTS "Event groups are viewable by event participants" ON event_groups;

CREATE POLICY "Everyone can view event groups"
ON event_groups
FOR SELECT
TO authenticated
USING (true);

-- 2. تحديث سياسات group_members للسماح بالانضمام للمجموعات
DROP POLICY IF EXISTS "Users can join groups" ON group_members;

CREATE POLICY "Users can join groups"
ON group_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 3. تحديث سياسات group_messages للسماح بالكتابة في جميع المجموعات
DROP POLICY IF EXISTS "Group members can create messages" ON group_messages;

CREATE POLICY "Group members can create messages"
ON group_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Group members can view messages" ON group_messages;

CREATE POLICY "Group members can view messages"
ON group_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- 4. حذف الـ trigger القديم أولاً ثم الـ function
DROP TRIGGER IF EXISTS on_group_created ON event_groups;
DROP FUNCTION IF EXISTS setup_group_moderators() CASCADE;

-- إعادة إنشاء الـ function بشكل صحيح
CREATE OR REPLACE FUNCTION setup_group_moderators()
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
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- تعيين أدمن كمشرف ثانٍ (فقط للمجموعات المرتبطة بفعالية)
  IF NEW.event_id IS NOT NULL THEN
    assigned_admin := assign_admin_to_group();
    
    IF assigned_admin IS NOT NULL THEN
      NEW.assigned_admin_id := assigned_admin;
      
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (NEW.id, assigned_admin, 'admin')
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER on_group_created
BEFORE INSERT ON event_groups
FOR EACH ROW
EXECUTE FUNCTION setup_group_moderators();

-- 5. إضافة constraint unique لمنع التكرار في group_members
ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

ALTER TABLE group_members
ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);

-- 6. إضافة المنظمين الحاليين كأعضاء في مجموعاتهم الموجودة
INSERT INTO group_members (group_id, user_id, role)
SELECT eg.id, eg.created_by, 'owner'
FROM event_groups eg
WHERE NOT EXISTS (
  SELECT 1 FROM group_members gm 
  WHERE gm.group_id = eg.id 
  AND gm.user_id = eg.created_by
)
ON CONFLICT (group_id, user_id) DO NOTHING;