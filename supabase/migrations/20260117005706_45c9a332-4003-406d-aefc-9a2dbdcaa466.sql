-- Fix: Secure suspended_users view - restrict to admins only
-- First, drop existing is_admin function to allow parameter rename
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Drop existing get_suspended_users function if it exists
DROP FUNCTION IF EXISTS public.get_suspended_users();

-- Create secure function for suspended users (replaces direct view access)
CREATE OR REPLACE FUNCTION public.get_suspended_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  suspended boolean,
  suspended_at timestamptz,
  suspended_until timestamptz,
  suspension_reason text,
  suspended_by uuid,
  warning_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this data
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.suspended,
    p.suspended_at,
    p.suspended_until,
    p.suspension_reason,
    p.suspended_by,
    p.warning_count
  FROM public.profiles p
  WHERE p.suspended = true;
END;
$$;

-- Revoke direct access to the suspended_users view from authenticated users
DO $$
BEGIN
  -- Revoke SELECT on suspended_users from authenticated if the view exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'suspended_users' AND schemaname = 'public') THEN
    EXECUTE 'REVOKE SELECT ON public.suspended_users FROM authenticated';
    EXECUTE 'REVOKE SELECT ON public.suspended_users FROM anon';
  END IF;
END $$;

-- Grant execute on the secure function to authenticated users
-- (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.get_suspended_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;