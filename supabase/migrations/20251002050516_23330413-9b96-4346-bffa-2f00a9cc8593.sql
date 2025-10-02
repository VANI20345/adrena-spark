-- Add suspended field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;

-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin_activity_logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_activity_logs
CREATE POLICY "Only admins can view activity logs"
ON public.admin_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Only admins can create activity logs"
ON public.admin_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity ON public.admin_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

-- Enable realtime for system_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;