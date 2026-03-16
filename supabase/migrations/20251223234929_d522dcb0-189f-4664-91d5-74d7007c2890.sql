-- ================================================
-- ADD ACTIVITY VISIBILITY TO PROFILES
-- ================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_visibility TEXT DEFAULT 'followers';

-- Add constraint separately to avoid issues
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_activity_visibility_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_activity_visibility_check 
    CHECK (activity_visibility IN ('public', 'followers', 'private'));
  END IF;
END $$;

-- ================================================
-- UPDATE USER_ACTIVITIES TABLE (add visibility if missing)
-- ================================================
ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'followers';

-- ================================================
-- MUTUAL FRIENDS FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION public.get_mutual_followers(user_a UUID, user_b UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT, display_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.display_id
  FROM public.profiles p
  WHERE p.user_id IN (
    -- People that both user_a and user_b follow
    SELECT uf1.following_id
    FROM public.user_follows uf1
    INNER JOIN public.user_follows uf2 ON uf1.following_id = uf2.following_id
    WHERE uf1.follower_id = user_a AND uf2.follower_id = user_b
  );
$$;