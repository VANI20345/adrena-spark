-- ===================================
-- إصلاح نهائي - إضافة دعم المجموعات الإقليمية
-- ===================================

-- 1. جعل event_id nullable
ALTER TABLE event_groups 
ALTER COLUMN event_id DROP NOT NULL;

-- 2. حذف القيد القديم على group_type
ALTER TABLE event_groups 
DROP CONSTRAINT IF EXISTS event_groups_group_type_check;

-- 3. إضافة قيد جديد يدعم 'region'
ALTER TABLE event_groups
ADD CONSTRAINT event_groups_group_type_check 
CHECK (group_type = ANY (ARRAY['whatsapp'::text, 'telegram'::text, 'internal'::text, 'region'::text]));

-- 4. تعطيل الـ trigger مؤقتاً
ALTER TABLE event_groups DISABLE TRIGGER on_group_created;

-- 5. حذف foreign keys القديمة
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;

ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS fk_group_members_group_id;

-- 6. نقل المجموعات الإقليمية إلى event_groups
INSERT INTO event_groups (
  id,
  group_name,
  group_type,
  event_id,
  created_by,
  current_members,
  max_members,
  created_at
)
SELECT 
  rg.id,
  COALESCE(rg.name_ar, rg.name),
  'region',
  NULL,
  (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
  0,
  10000,
  rg.created_at
FROM regional_groups rg
WHERE NOT EXISTS (
  SELECT 1 FROM event_groups eg WHERE eg.id = rg.id
)
ON CONFLICT (id) DO NOTHING;

-- 7. إعادة إضافة foreign key
ALTER TABLE group_members
ADD CONSTRAINT group_members_group_id_fkey
FOREIGN KEY (group_id) REFERENCES event_groups(id) ON DELETE CASCADE;

-- 8. إعادة تفعيل الـ trigger
ALTER TABLE event_groups ENABLE TRIGGER on_group_created;

-- 9. تحديث سياسات RLS
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Group members can view group membership" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Organizers can manage group members" ON group_members;
DROP POLICY IF EXISTS "Users can join any group" ON group_members;
DROP POLICY IF EXISTS "Everyone can view group members" ON group_members;
DROP POLICY IF EXISTS "Organizers and admins can remove members" ON group_members;

CREATE POLICY "Users can join any group"
ON group_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view group members"
ON group_members FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Organizers and admins can remove members"
ON group_members FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM event_groups eg
    WHERE eg.id = group_members.group_id 
    AND (eg.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  )
);