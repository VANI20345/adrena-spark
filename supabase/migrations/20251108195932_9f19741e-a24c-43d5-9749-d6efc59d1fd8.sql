-- حذف جميع جداول الأصدقاء والعلاقات المتعلقة بها

-- حذف friend_group_chat_messages أولاً لأنه يعتمد على جداول أخرى
DROP TABLE IF EXISTS public.friend_group_chat_messages CASCADE;

-- حذف friend_group_chat_members
DROP TABLE IF EXISTS public.friend_group_chat_members CASCADE;

-- حذف friend_group_chats
DROP TABLE IF EXISTS public.friend_group_chats CASCADE;

-- حذف friend_list_members
DROP TABLE IF EXISTS public.friend_list_members CASCADE;

-- حذف friend_lists
DROP TABLE IF EXISTS public.friend_lists CASCADE;

-- حذف friend_messages
DROP TABLE IF EXISTS public.friend_messages CASCADE;

-- حذف friend_activities
DROP TABLE IF EXISTS public.friend_activities CASCADE;

-- حذف event_shares (مشاركة الفعاليات مع الأصدقاء)
DROP TABLE IF EXISTS public.event_shares CASCADE;

-- حذف friend_requests
DROP TABLE IF EXISTS public.friend_requests CASCADE;

-- حذف friendships
DROP TABLE IF EXISTS public.friendships CASCADE;

-- حذف followers
DROP TABLE IF EXISTS public.followers CASCADE;

-- إنشاء جدول event_interests لربط الفعاليات بالاهتمامات
CREATE TABLE IF NOT EXISTS public.event_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, interest_id)
);

-- تفعيل RLS على جدول event_interests
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول event_interests
CREATE POLICY "Everyone can view event interests"
  ON public.event_interests
  FOR SELECT
  USING (true);

CREATE POLICY "Event organizers can manage their event interests"
  ON public.event_interests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_interests.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all event interests"
  ON public.event_interests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_event_interests_event_id ON public.event_interests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_interest_id ON public.event_interests(interest_id);