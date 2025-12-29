-- Create followers system table
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  -- Prevent self-following
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created ON public.followers(created_at DESC);

-- Add follower counts to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create indexes for follower counts
CREATE INDEX IF NOT EXISTS idx_profiles_followers_count ON public.profiles(followers_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_following_count ON public.profiles(following_count DESC);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_admin.user_id
    AND role = 'admin'::app_role
  );
$$;

-- RLS Policies for followers table
-- Users can view their own follows
CREATE POLICY "Users can view their own follows"
ON public.followers FOR SELECT
USING (
  follower_id = auth.uid() OR following_id = auth.uid()
);

-- Users can follow others (except admins unless they are admin)
CREATE POLICY "Users can follow non-admins"
ON public.followers FOR INSERT
WITH CHECK (
  follower_id = auth.uid() AND
  (
    -- Can follow if target is not admin
    NOT is_admin(following_id) OR
    -- OR if the follower is admin (admins can follow anyone)
    is_admin(follower_id)
  )
);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.followers FOR DELETE
USING (follower_id = auth.uid());

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
ON public.followers FOR SELECT
USING (is_admin(auth.uid()));

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE user_id = NEW.follower_id;
    
    -- Increment followers count for followed user
    UPDATE profiles 
    SET followers_count = followers_count + 1
    WHERE user_id = NEW.following_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.follower_id;
    
    -- Decrement followers count for followed user
    UPDATE profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = OLD.following_id;
    
    RETURN OLD;
  END IF;
END;
$$;

-- Create trigger for updating follower counts
DROP TRIGGER IF EXISTS update_follower_counts_trigger ON public.followers;
CREATE TRIGGER update_follower_counts_trigger
AFTER INSERT OR DELETE ON public.followers
FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Add realtime for followers
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;

COMMENT ON TABLE public.followers IS 'Manages user follow relationships';
COMMENT ON FUNCTION update_follower_counts() IS 'Automatically updates follower/following counts on profiles';
COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user has admin role';
