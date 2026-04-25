-- Add birth_date, gender, and interests columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.birth_date IS 'User date of birth';
COMMENT ON COLUMN public.profiles.gender IS 'User gender (male/female)';
COMMENT ON COLUMN public.profiles.interests IS 'User interests array';