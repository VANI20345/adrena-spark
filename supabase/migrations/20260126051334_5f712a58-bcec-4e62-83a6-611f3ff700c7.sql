-- Fix RLS policies for user_roles - drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and super_admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow viewing own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admins to view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Recreate user_roles policies
-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admins and super_admins can view all roles
CREATE POLICY "Admins and super_admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can insert roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can delete roles (but not their own)
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_admin')
  AND user_id != auth.uid()
);