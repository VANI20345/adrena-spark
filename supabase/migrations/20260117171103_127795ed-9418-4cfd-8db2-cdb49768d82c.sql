-- =====================================================
-- FIX 1: PROFILES TABLE - Protect Sensitive PII
-- =====================================================
-- Create a public view that excludes sensitive PII columns
-- The base table will have restricted access

-- First, drop the overly permissive SELECT policies
DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous can view profiles for public group members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles or own profile" ON public.profiles;

-- Create secure view that excludes sensitive PII
-- This view will be used for public profile lookups
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  display_id,
  full_name,
  avatar_url,
  bio,
  city,
  profile_visibility,
  activity_visibility,
  interests_visibility,
  allow_friend_requests,
  interests,
  followers_count,
  following_count,
  is_shield_member,
  verification_status,
  last_activity,
  created_at,
  updated_at
  -- EXCLUDED: email, phone, birth_date, address, gender
  -- EXCLUDED: id_document_url, license_url, commercial_registration_url
  -- EXCLUDED: suspended, suspended_at, suspended_by, suspended_until, suspension_reason
  -- EXCLUDED: warning_count, referral_code, referred_by, referral_count
  -- EXCLUDED: points_balance, total_points_earned, auto_redeem_points, service_types
FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Now create restrictive policies for the base profiles table
-- Policy 1: Users can always view their own full profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all full profiles
CREATE POLICY "Admins can view all full profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
  );

-- Policy 3: Service role can access all profiles (for edge functions)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Now we need RLS policies for the profiles_public view access
-- The view uses security_invoker=on, so it respects the caller's permissions
-- We need to allow authenticated and anon users to query the base table
-- through the view, but ONLY for public profiles

-- Policy 4: Allow viewing basic profile data through view for public profiles
CREATE POLICY "View public profiles via view"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (profile_visibility = 'public'::profile_visibility);

-- Policy 5: Allow viewing profiles of users in public groups (for group functionality)
CREATE POLICY "View profiles of public group members"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN event_groups eg ON eg.id = gm.group_id
      WHERE gm.user_id = profiles.user_id
        AND eg.visibility = 'public'
        AND eg.archived_at IS NULL
    )
  );

-- Policy 6: Authenticated users can view profiles they follow
CREATE POLICY "View profiles of followed users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE user_follows.follower_id = auth.uid()
        AND user_follows.following_id = profiles.user_id
    )
  );

-- =====================================================
-- FIX 2: CONTACT_SUBMISSIONS TABLE - Admin-Only Read
-- =====================================================
-- Ensure only admins can read contact submissions

-- Check if there's any policy allowing non-admin SELECT
-- The "Admins can view all submissions" policy already exists
-- We need to ensure there are no other SELECT policies

-- Drop any accidental permissive policies (if they exist)
DROP POLICY IF EXISTS "Anyone can view submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.contact_submissions;

-- The existing policies are correct:
-- - "Admins can view all submissions" (SELECT for admins only)
-- - "Admins can update submissions" (UPDATE for admins only)  
-- - "Anyone can submit contact form" (INSERT with validation)

-- Add service role access for edge functions if needed
CREATE POLICY "Service role can manage contact submissions"
  ON public.contact_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Create helper function for checking if user can see full profile
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_view_full_profile(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User viewing their own profile
    auth.uid() = _target_user_id
    OR
    -- User is an admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'::app_role
    )
    OR
    -- User follows the target
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE user_follows.follower_id = auth.uid()
        AND user_follows.following_id = _target_user_id
    )
$$;