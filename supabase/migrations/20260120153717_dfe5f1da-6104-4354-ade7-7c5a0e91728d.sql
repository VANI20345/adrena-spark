-- =====================================================
-- FIX ERROR-LEVEL SECURITY ISSUES
-- =====================================================

-- 1. FIX SECURITY DEFINER VIEWS
-- Recreate profiles_public and suspended_users views with security_invoker=on

-- Drop and recreate profiles_public view with security_invoker=on
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  p.user_id,
  p.display_id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.interests,
  p.last_activity,
  p.created_at,
  p.updated_at,
  p.profile_visibility,
  COALESCE(pc.followers_count, 0) AS followers_count,
  COALESCE(pc.following_count, 0) AS following_count,
  COALESCE(ug.is_shield_member, false) AS is_shield_member
FROM public.profiles p
LEFT JOIN public.profile_counts pc ON pc.user_id = p.user_id
LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id;

-- Drop and recreate suspended_users view with security_invoker=on
DROP VIEW IF EXISTS public.suspended_users;

CREATE VIEW public.suspended_users
WITH (security_invoker=on) AS
SELECT 
  us.user_id,
  us.reason AS suspension_reason,
  us.suspended_at,
  us.suspended_until,
  us.suspended_by,
  us.is_active AS suspended
FROM public.user_suspensions us
WHERE us.is_active = true;

-- 2. FIX UNPROTECTED DELETE USER FUNCTION
-- Recreate with admin authorization check

CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- CRITICAL: Check if caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Log the deletion for audit trail
  INSERT INTO public.admin_activity_logs (admin_id, entity_type, entity_id, action, details)
  VALUES (
    auth.uid(),
    'user',
    target_user_id,
    'delete_user_completely',
    jsonb_build_object('deleted_at', now())
  );

  -- Delete from all related tables
  DELETE FROM public.bookings WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.loyalty_ledger WHERE user_id = target_user_id;
  DELETE FROM public.user_wallets WHERE user_id = target_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id = target_user_id;
  DELETE FROM public.bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.refunds WHERE user_id = target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = target_user_id;
  DELETE FROM public.user_gamification WHERE user_id = target_user_id;
  DELETE FROM public.user_suspensions WHERE user_id = target_user_id;
  DELETE FROM public.user_privacy_settings WHERE user_id = target_user_id;
  DELETE FROM public.profile_contacts WHERE user_id = target_user_id;
  DELETE FROM public.follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM public.follow_requests WHERE requester_id = target_user_id OR target_id = target_user_id;
  DELETE FROM public.group_memberships WHERE user_id = target_user_id;
  DELETE FROM public.group_join_requests WHERE user_id = target_user_id;
  DELETE FROM public.posts WHERE user_id = target_user_id;
  DELETE FROM public.comments WHERE user_id = target_user_id;
  DELETE FROM public.post_reactions WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Finally delete from auth.users (requires proper permissions)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 3. FIX PROFILES PII EXPOSURE
-- Remove overly permissive RLS policies that expose sensitive columns
-- Keep only: own profile access, admin access, and view-based public access

-- Drop the overly permissive SELECT policies
DROP POLICY IF EXISTS "View public profiles via view" ON public.profiles;
DROP POLICY IF EXISTS "View profiles of public group members" ON public.profiles;
DROP POLICY IF EXISTS "View profiles of followed users" ON public.profiles;

-- Create restricted policies that force use of the profiles_public view
-- Users should use profiles_public view for public profile data access
-- Direct profiles table access is restricted to:
-- 1. Own profile (full access)
-- 2. Admins (full access)
-- 3. Service role (full access - for backend operations)

-- Note: The profiles_public view exposes only safe columns
-- Application code should query profiles_public instead of profiles
-- for any public profile information needs