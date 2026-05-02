ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS activity_visibility text NOT NULL DEFAULT 'followers',
  ADD COLUMN IF NOT EXISTS allow_friend_requests boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_visibility_check
  CHECK (profile_visibility IN ('public','friends_only','private'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_activity_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_activity_visibility_check
  CHECK (activity_visibility IN ('public','followers','private'));