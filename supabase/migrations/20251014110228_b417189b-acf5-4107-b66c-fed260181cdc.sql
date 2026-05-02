-- جدول الرسائل المبلغ عنها
CREATE TABLE IF NOT EXISTS public.reported_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('group', 'friend_group', 'direct')),
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  message_content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Users can report messages"
  ON public.reported_messages
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their reports"
  ON public.reported_messages
  FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all reports"
  ON public.reported_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

CREATE POLICY "Admins can update reports"
  ON public.reported_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Index لتحسين الأداء
CREATE INDEX idx_reported_messages_status ON public.reported_messages(status);
CREATE INDEX idx_reported_messages_message_type ON public.reported_messages(message_type);
CREATE INDEX idx_reported_messages_created_at ON public.reported_messages(created_at DESC);
CREATE INDEX idx_reported_messages_reported_by ON public.reported_messages(reported_by);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_reported_messages_updated_at
  BEFORE UPDATE ON public.reported_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();