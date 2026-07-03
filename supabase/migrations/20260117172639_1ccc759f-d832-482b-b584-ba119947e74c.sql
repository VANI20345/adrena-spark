-- =====================================================
-- PHASE 1: Profile Table Decomposition
-- Decompose the 40+ column profiles table into focused tables
-- =====================================================

-- 1. Create profile_contacts table (sensitive contact info)
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create provider_verifications table
CREATE TABLE IF NOT EXISTS public.provider_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'resubmit')),
  id_document_url text,
  license_url text,
  commercial_registration_url text,
  service_types text[],
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create user_suspensions table (history of suspensions)
-- Using regular boolean + trigger instead of generated column (now() is not immutable)
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  suspended_at timestamptz DEFAULT now(),
  suspended_until timestamptz, -- NULL = permanent
  suspended_by uuid REFERENCES auth.users(id),
  lifted_at timestamptz, -- NULL = still active
  lifted_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. Create user_gamification table
CREATE TABLE IF NOT EXISTS public.user_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance integer DEFAULT 0,
  total_points_earned integer DEFAULT 0,
  referral_code text UNIQUE,
  referral_count integer DEFAULT 0,
  referred_by uuid REFERENCES auth.users(id),
  is_shield_member boolean DEFAULT false,
  auto_redeem_points boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create user_privacy_settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'followers')),
  interests_visibility text DEFAULT 'public',
  activity_visibility text DEFAULT 'public',
  allow_friend_requests boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- MIGRATE DATA FROM PROFILES TO NEW TABLES
-- =====================================================

-- Migrate contact data
INSERT INTO public.profile_contacts (user_id, email, phone, address, created_at, updated_at)
SELECT user_id, email, phone, address, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Migrate provider verification data (only for providers)
INSERT INTO public.provider_verifications (user_id, verification_status, id_document_url, license_url, commercial_registration_url, service_types, created_at, updated_at)
SELECT 
  p.user_id, 
  COALESCE(p.verification_status, 'pending'),
  p.id_document_url,
  p.license_url,
  p.commercial_registration_url,
  p.service_types,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'provider'
)
ON CONFLICT (user_id) DO NOTHING;

-- Migrate suspension data (create records for currently suspended users)
INSERT INTO public.user_suspensions (user_id, reason, suspended_at, suspended_until, suspended_by, is_active)
SELECT 
  user_id,
  COALESCE(suspension_reason, 'Migrated suspension'),
  COALESCE(suspended_at, now()),
  suspended_until,
  suspended_by,
  true
FROM public.profiles
WHERE suspended = true
ON CONFLICT DO NOTHING;

-- Migrate gamification data
INSERT INTO public.user_gamification (user_id, points_balance, total_points_earned, referral_code, referral_count, referred_by, is_shield_member, auto_redeem_points, created_at, updated_at)
SELECT 
  user_id,
  COALESCE(points_balance, 0),
  COALESCE(total_points_earned, 0),
  referral_code,
  COALESCE(referral_count, 0),
  referred_by::uuid,
  COALESCE(is_shield_member, false),
  COALESCE(auto_redeem_points, false),
  created_at,
  updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Migrate privacy settings
INSERT INTO public.user_privacy_settings (user_id, profile_visibility, interests_visibility, activity_visibility, allow_friend_requests, created_at, updated_at)
SELECT 
  user_id,
  COALESCE(profile_visibility::text, 'public'),
  COALESCE(interests_visibility, 'public'),
  COALESCE(activity_visibility, 'public'),
  COALESCE(allow_friend_requests, true),
  created_at,
  updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR profile_contacts
-- =====================================================

CREATE POLICY "Users can view own contacts"
  ON public.profile_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts"
  ON public.profile_contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own contacts"
  ON public.profile_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON public.profile_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to contacts"
  ON public.profile_contacts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- RLS POLICIES FOR provider_verifications
-- =====================================================

CREATE POLICY "Providers can view own verification"
  ON public.provider_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
  ON public.provider_verifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Providers can update own verification"
  ON public.provider_verifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Providers can insert own verification"
  ON public.provider_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verifications"
  ON public.provider_verifications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access to verifications"
  ON public.provider_verifications FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- RLS POLICIES FOR user_suspensions
-- =====================================================

CREATE POLICY "Users can view own suspensions"
  ON public.user_suspensions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspensions"
  ON public.user_suspensions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage suspensions"
  ON public.user_suspensions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access to suspensions"
  ON public.user_suspensions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- RLS POLICIES FOR user_gamification
-- =====================================================

CREATE POLICY "Users can view own gamification"
  ON public.user_gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others public gamification"
  ON public.user_gamification FOR SELECT
  USING (true);

CREATE POLICY "Users can update own gamification"
  ON public.user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON public.user_gamification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to gamification"
  ON public.user_gamification FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- RLS POLICIES FOR user_privacy_settings
-- =====================================================

CREATE POLICY "Users can view own privacy settings"
  ON public.user_privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all privacy settings"
  ON public.user_privacy_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own privacy settings"
  ON public.user_privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON public.user_privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to privacy settings"
  ON public.user_privacy_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- CREATE INDEXES FOR NEW TABLES
-- =====================================================

CREATE INDEX idx_profile_contacts_user_id ON public.profile_contacts(user_id);
CREATE INDEX idx_provider_verifications_user_id ON public.provider_verifications(user_id);
CREATE INDEX idx_provider_verifications_status ON public.provider_verifications(verification_status);
CREATE INDEX idx_user_suspensions_user_id ON public.user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_active ON public.user_suspensions(user_id) WHERE is_active = true;
CREATE INDEX idx_user_gamification_user_id ON public.user_gamification(user_id);
CREATE INDEX idx_user_gamification_referral_code ON public.user_gamification(referral_code);
CREATE INDEX idx_user_privacy_settings_user_id ON public.user_privacy_settings(user_id);

-- =====================================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_profile_contacts_updated_at
  BEFORE UPDATE ON public.profile_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_provider_verifications_updated_at
  BEFORE UPDATE ON public.provider_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_gamification_updated_at
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_privacy_settings_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- FUNCTION TO UPDATE SUSPENSION STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_suspension_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If lifted_at is set, mark as inactive
  IF NEW.lifted_at IS NOT NULL THEN
    NEW.is_active = false;
  -- If suspended_until is passed, mark as inactive
  ELSIF NEW.suspended_until IS NOT NULL AND NEW.suspended_until < now() THEN
    NEW.is_active = false;
  ELSE
    NEW.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_suspension_status_trigger
  BEFORE INSERT OR UPDATE ON public.user_suspensions
  FOR EACH ROW EXECUTE FUNCTION public.update_suspension_status();

-- =====================================================
-- CREATE HELPER FUNCTION TO CHECK IF USER IS SUSPENDED
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_user_suspended(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_suspensions
    WHERE user_id = target_user_id
      AND is_active = true
  );
$$;

-- =====================================================
-- CREATE VIEW FOR BACKWARD COMPATIBILITY
-- =====================================================

CREATE OR REPLACE VIEW public.profiles_complete AS
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
  pc.email,
  pc.phone,
  pc.address,
  pv.verification_status,
  pv.id_document_url,
  pv.license_url,
  pv.commercial_registration_url,
  pv.service_types,
  COALESCE(us.is_active, false) as suspended,
  us.reason as suspension_reason,
  us.suspended_at,
  us.suspended_until,
  us.suspended_by,
  COALESCE(ug.points_balance, 0) as points_balance,
  COALESCE(ug.total_points_earned, 0) as total_points_earned,
  ug.referral_code,
  COALESCE(ug.referral_count, 0) as referral_count,
  ug.referred_by,
  COALESCE(ug.is_shield_member, false) as is_shield_member,
  COALESCE(ug.auto_redeem_points, false) as auto_redeem_points,
  COALESCE(ups.profile_visibility, 'public') as profile_visibility,
  COALESCE(ups.interests_visibility, 'public') as interests_visibility,
  COALESCE(ups.activity_visibility, 'public') as activity_visibility,
  COALESCE(ups.allow_friend_requests, true) as allow_friend_requests,
  p.followers_count,
  p.following_count,
  p.warning_count
FROM public.profiles p
LEFT JOIN public.profile_contacts pc ON pc.user_id = p.user_id
LEFT JOIN public.provider_verifications pv ON pv.user_id = p.user_id
LEFT JOIN public.user_suspensions us ON us.user_id = p.user_id AND us.is_active = true
LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id
LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.user_id;

-- =====================================================
-- CREATE TRIGGER TO AUTO-CREATE RELATED RECORDS
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_profile_related_records()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile_contacts (user_id, email)
  VALUES (NEW.user_id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_gamification (user_id, referral_code)
  VALUES (NEW.user_id, NEW.referral_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_profile_related_records_trigger ON public.profiles;
CREATE TRIGGER create_profile_related_records_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_related_records();