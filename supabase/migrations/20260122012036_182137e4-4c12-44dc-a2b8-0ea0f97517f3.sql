-- ============================================
-- DATABASE CLEANUP: Remove Duplicate Columns
-- Maintain 3NF by using normalized tables
-- ============================================

-- Step 0: Create has_role helper function first
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
      AND role = _role
  )
$$;

-- Step 1: Drop all dependent policies first
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Drop existing views that depend on profiles columns
DROP VIEW IF EXISTS public.profiles_public CASCADE;
DROP VIEW IF EXISTS public.profiles_complete CASCADE;

-- Step 3: Ensure data is migrated to normalized tables before removing columns
-- Migrate any remaining data from profiles to profile_contacts
INSERT INTO public.profile_contacts (user_id, email, phone, address)
SELECT p.user_id, p.email, p.phone, p.address
FROM public.profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM public.profile_contacts)
  AND (p.email IS NOT NULL OR p.phone IS NOT NULL OR p.address IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, profile_contacts.email),
  phone = COALESCE(EXCLUDED.phone, profile_contacts.phone),
  address = COALESCE(EXCLUDED.address, profile_contacts.address);

-- Migrate any remaining data from profiles to provider_verifications
INSERT INTO public.provider_verifications (user_id, verification_status, id_document_url, license_url, commercial_registration_url, service_types)
SELECT p.user_id, p.verification_status, p.id_document_url, p.license_url, p.commercial_registration_url, p.service_types
FROM public.profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM public.provider_verifications)
  AND (p.verification_status IS NOT NULL OR p.service_types IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  verification_status = COALESCE(EXCLUDED.verification_status, provider_verifications.verification_status),
  id_document_url = COALESCE(EXCLUDED.id_document_url, provider_verifications.id_document_url),
  license_url = COALESCE(EXCLUDED.license_url, provider_verifications.license_url),
  commercial_registration_url = COALESCE(EXCLUDED.commercial_registration_url, provider_verifications.commercial_registration_url),
  service_types = COALESCE(EXCLUDED.service_types, provider_verifications.service_types);

-- Migrate privacy settings
INSERT INTO public.user_privacy_settings (user_id, profile_visibility, interests_visibility, activity_visibility, allow_friend_requests)
SELECT p.user_id, 
       COALESCE(p.profile_visibility::text, 'public'), 
       COALESCE(p.interests_visibility, 'public'),
       COALESCE(p.activity_visibility, 'public'),
       COALESCE(p.allow_friend_requests, true)
FROM public.profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM public.user_privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Migrate active suspensions to user_suspensions
INSERT INTO public.user_suspensions (user_id, reason, suspended_at, suspended_until, suspended_by, is_active)
SELECT p.user_id, p.suspension_reason, p.suspended_at, p.suspended_until, p.suspended_by, p.suspended
FROM public.profiles p
WHERE p.suspended = true
  AND p.user_id NOT IN (SELECT user_id FROM public.user_suspensions WHERE is_active = true)
ON CONFLICT DO NOTHING;

-- Step 4: Remove duplicate columns from profiles table
-- Contact info (now in profile_contacts)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS address CASCADE;

-- Provider verification (now in provider_verifications)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS verification_status CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS id_document_url CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS license_url CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS commercial_registration_url CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS service_types CASCADE;

-- Suspension info (now in user_suspensions)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_at CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_until CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_by CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspension_reason CASCADE;

-- Privacy settings (now in user_privacy_settings)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_visibility CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS interests_visibility CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS activity_visibility CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS allow_friend_requests CASCADE;

-- Step 5: Recreate profiles_public view (for public discovery, no sensitive data)
CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker=on) AS
SELECT 
  p.id,
  p.user_id,
  p.display_id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.interests,
  p.followers_count,
  p.following_count,
  p.last_activity,
  p.created_at,
  p.updated_at,
  COALESCE(ug.is_shield_member, false) as is_shield_member,
  COALESCE(pv.verification_status, 'none') as verification_status,
  COALESCE(ups.profile_visibility, 'public') as profile_visibility,
  COALESCE(ups.interests_visibility, 'public') as interests_visibility,
  COALESCE(ups.activity_visibility, 'public') as activity_visibility,
  COALESCE(ups.allow_friend_requests, true) as allow_friend_requests
FROM public.profiles p
LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id
LEFT JOIN public.provider_verifications pv ON pv.user_id = p.user_id
LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.user_id;

-- Step 6: Recreate profiles_complete view (for admin/owner access, all data)
CREATE OR REPLACE VIEW public.profiles_complete WITH (security_invoker=on) AS
SELECT 
  p.id,
  p.user_id,
  p.display_id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.gender,
  p.birth_date,
  p.interests,
  p.last_activity,
  p.created_at,
  p.updated_at,
  p.followers_count,
  p.following_count,
  p.warning_count,
  -- From profile_contacts
  pc.email,
  pc.phone,
  pc.address,
  -- From provider_verifications
  COALESCE(pv.verification_status, 'none') as verification_status,
  pv.id_document_url,
  pv.license_url,
  pv.commercial_registration_url,
  pv.service_types,
  pv.rejection_reason,
  pv.verified_at,
  pv.verified_by,
  -- From user_suspensions (active only)
  COALESCE(us.is_active, false) as suspended,
  us.reason as suspension_reason,
  us.suspended_at,
  us.suspended_until,
  us.suspended_by,
  -- From user_gamification
  COALESCE(ug.points_balance, 0) as points_balance,
  COALESCE(ug.total_points_earned, 0) as total_points_earned,
  ug.referral_code,
  COALESCE(ug.referral_count, 0) as referral_count,
  ug.referred_by,
  COALESCE(ug.is_shield_member, false) as is_shield_member,
  COALESCE(ug.auto_redeem_points, false) as auto_redeem_points,
  -- From user_privacy_settings
  COALESCE(ups.profile_visibility, 'public') as profile_visibility,
  COALESCE(ups.interests_visibility, 'public') as interests_visibility,
  COALESCE(ups.activity_visibility, 'public') as activity_visibility,
  COALESCE(ups.allow_friend_requests, true) as allow_friend_requests
FROM public.profiles p
LEFT JOIN public.profile_contacts pc ON pc.user_id = p.user_id
LEFT JOIN public.provider_verifications pv ON pv.user_id = p.user_id
LEFT JOIN public.user_suspensions us ON us.user_id = p.user_id AND us.is_active = true
LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id
LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.user_id;

-- Step 7: Recreate RLS policies for profiles (simplified, using helper functions)
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Public profiles are viewable by authenticated users
-- Uses the user_privacy_settings table for visibility check
CREATE POLICY "Users can view public profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_privacy_settings ups
    WHERE ups.user_id = profiles.user_id
    AND ups.profile_visibility = 'public'
  )
  OR EXISTS (
    SELECT 1 FROM public.group_memberships gm1
    JOIN public.group_memberships gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = auth.uid() AND f.following_id = profiles.user_id
  )
);

-- Step 8: Helper functions for common operations
-- Helper: Get user's verification status
CREATE OR REPLACE FUNCTION public.get_verification_status(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(verification_status, 'none')
  FROM public.provider_verifications
  WHERE user_id = target_user_id
$$;

-- Helper: Check if user is suspended
CREATE OR REPLACE FUNCTION public.is_user_suspended(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_suspensions WHERE user_id = target_user_id AND is_active = true LIMIT 1),
    false
  )
$$;

-- Step 9: Update the trigger to create related records on profile creation
CREATE OR REPLACE FUNCTION public.create_profile_related_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile_contacts record
  INSERT INTO public.profile_contacts (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user_gamification record
  INSERT INTO public.user_gamification (user_id, referral_code)
  VALUES (NEW.user_id, UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)))
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user_privacy_settings record
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_related_records();