
-- =====================================================
-- FIX: Profiles RLS Policy for Public Discovery
-- =====================================================
-- The current profiles table RLS only allows users to view their own profile
-- This breaks user discovery, follower lists, and group member displays
-- We need to add a policy that allows viewing public profile fields

-- First, drop duplicate policies on follows table
DROP POLICY IF EXISTS "Everyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can create follows" ON public.follows;

-- Now add a policy for viewing public profiles (for discovery, search, etc.)
-- Users can view basic profile info of public profiles and profiles of people they follow
CREATE POLICY "Users can view public profiles"
ON public.profiles FOR SELECT
USING (
  -- Public profiles are viewable by anyone
  profile_visibility = 'public'
  OR
  -- Users can view profiles of people they follow
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE follows.follower_id = auth.uid()
    AND follows.following_id = profiles.user_id
  )
  OR
  -- Users can view profiles of people in the same group
  EXISTS (
    SELECT 1 FROM public.group_memberships gm1
    JOIN public.group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = profiles.user_id
  )
);

-- Fix INSERT policy on follows table that's missing WITH CHECK
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Ensure profiles_public view is accessible (it uses security_invoker so it inherits RLS)
-- The view is already correctly defined, the issue is the base table RLS

-- Also create a helper function for checking if a user can view a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = target_user_id
    AND (
      -- Own profile
      user_id = auth.uid()
      OR
      -- Public profile
      profile_visibility = 'public'
      OR
      -- Following the user
      EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
        AND following_id = target_user_id
      )
      OR
      -- In same group
      EXISTS (
        SELECT 1 FROM group_memberships gm1
        JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = target_user_id
      )
      OR
      -- Is admin
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    )
  );
$$;
