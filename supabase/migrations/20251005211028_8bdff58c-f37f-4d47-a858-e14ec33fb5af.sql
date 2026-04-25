-- 1. إنشاء bucket للميديا في المجموعات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-media',
  'group-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. إنشاء جدول للمرفقات
CREATE TABLE IF NOT EXISTS public.group_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio'
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS على جدول المرفقات
ALTER TABLE public.group_message_attachments ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies للمرفقات
CREATE POLICY "Group members can view attachments"
ON public.group_message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = group_message_attachments.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can create attachments"
ON public.group_message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = group_message_attachments.message_id
    AND gmem.user_id = auth.uid()
  )
);

-- 5. Storage policies للميديا
CREATE POLICY "Group members can view group media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'group-media'
  AND (
    -- يمكن للجميع رؤية الملفات العامة
    auth.role() = 'authenticated'
  )
);

CREATE POLICY "Group members can upload group media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'group-media'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'group-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'group-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. تحديث trigger لإضافة جميع الأدمنز
DROP TRIGGER IF EXISTS on_group_created ON public.event_groups;
DROP FUNCTION IF EXISTS public.setup_group_moderators();

CREATE OR REPLACE FUNCTION public.setup_group_moderators()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  -- تعيين المنشئ كـ owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- للمجموعات المرتبطة بفعالية: إضافة جميع الأدمنز
  IF NEW.event_id IS NOT NULL OR NEW.group_type = 'region' THEN
    -- إضافة جميع الأدمنز كمشرفين
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
$$;

CREATE TRIGGER on_group_created
BEFORE INSERT ON public.event_groups
FOR EACH ROW
EXECUTE FUNCTION public.setup_group_moderators();

-- 7. إضافة عمود لتتبع وقت انضمام العضو (لتصفية الرسائل)
-- موجود بالفعل في group_members: joined_at

-- 8. تحديث current_members عند إضافة/حذف أعضاء
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS update_group_count_on_member_change ON public.group_members;
CREATE TRIGGER update_group_count_on_member_change
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count();

-- 9. إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
ON public.group_message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_group_messages_created_at 
ON public.group_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_group_members_joined_at 
ON public.group_members(joined_at);