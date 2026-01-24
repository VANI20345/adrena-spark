-- Create system_settings table for maintenance mode and other settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "Only admins can manage system settings"
ON public.system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('maintenance_mode', '{"enabled": false, "message": "الموقع تحت الصيانة حالياً"}'::jsonb, 'Maintenance mode settings'),
('registration_enabled', '{"enabled": true}'::jsonb, 'Allow new user registrations'),
('site_name', '{"ar": "أدرينا", "en": "Adrena"}'::jsonb, 'Site name in different languages')
ON CONFLICT (key) DO NOTHING;

-- Create system_logs table for real system logging
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view system logs
CREATE POLICY "Only admins can view system logs"
ON public.system_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);

-- Create function to log system events
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_level TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.system_logs (level, message, details, user_id)
  VALUES (p_level, p_message, p_details, auth.uid())
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create trigger to update system_settings updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_timestamp();