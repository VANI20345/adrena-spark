-- Allow everyone to read system settings (specifically for maintenance mode check)
-- This ensures regular users can see when the site is in maintenance mode

CREATE POLICY "Everyone can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated, anon
USING (true);