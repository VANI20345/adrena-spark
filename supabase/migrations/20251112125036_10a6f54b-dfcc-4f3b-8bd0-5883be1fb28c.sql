-- إنشاء جدول نظام المتابعة
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- إنشاء indexes لتحسين الأداء
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

-- تفعيل RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- سياسة السماح للجميع بقراءة المتابعات
CREATE POLICY "Everyone can view follows"
  ON public.user_follows
  FOR SELECT
  USING (true);

-- سياسة السماح للمستخدمين بإضافة متابعات
CREATE POLICY "Users can create follows"
  ON public.user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- سياسة السماح للمستخدمين بحذف متابعاتهم
CREATE POLICY "Users can delete their follows"
  ON public.user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- تحديث عداد المتابعين عند الإضافة/الحذف (trigger موجود بالفعل)
-- trigger update_follower_counts موجود بالفعل في قاعدة البيانات