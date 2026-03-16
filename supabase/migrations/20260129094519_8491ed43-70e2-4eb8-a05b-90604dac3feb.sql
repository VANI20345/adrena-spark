-- Drop existing policies on admin_activity_logs
DROP POLICY IF EXISTS "Only admins can view activity logs" ON public.admin_activity_logs;
DROP POLICY IF EXISTS "Only admins can create activity logs" ON public.admin_activity_logs;

-- Create updated SELECT policy that includes both admin and super_admin
CREATE POLICY "Admins and super admins can view activity logs"
ON public.admin_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
);

-- Create updated INSERT policy that includes both admin and super_admin
CREATE POLICY "Admins and super admins can create activity logs"
ON public.admin_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
);

-- Also check super_admin_activity_logs table
DROP POLICY IF EXISTS "Super admins can view logs" ON public.super_admin_activity_logs;
DROP POLICY IF EXISTS "Super admins can create logs" ON public.super_admin_activity_logs;

-- Create SELECT policy for super_admin_activity_logs
CREATE POLICY "Super admins can view their logs"
ON public.super_admin_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  )
);

-- Create INSERT policy for super_admin_activity_logs
CREATE POLICY "Super admins can create logs"
ON public.super_admin_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  )
);