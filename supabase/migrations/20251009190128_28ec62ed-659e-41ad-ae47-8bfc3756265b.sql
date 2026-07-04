-- Add display_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN display_id TEXT UNIQUE;

-- Create function to generate unique display_id
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
  counter INTEGER := 1;
BEGIN
  LOOP
    -- Generate ID in format USR-00001, USR-00002, etc.
    new_id := 'USR-' || LPAD(counter::TEXT, 5, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE display_id = new_id) INTO id_exists;
    
    -- If ID doesn't exist, return it
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
    
    -- Increment counter and try again
    counter := counter + 1;
  END LOOP;
END;
$$;

-- Create trigger function to auto-generate display_id on insert
CREATE OR REPLACE FUNCTION public.set_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := generate_display_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new profiles
CREATE TRIGGER set_profile_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_display_id();

-- Backfill existing users with display_ids
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN (SELECT id FROM profiles WHERE display_id IS NULL ORDER BY created_at ASC)
  LOOP
    UPDATE profiles 
    SET display_id = generate_display_id() 
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Make display_id NOT NULL after backfill
ALTER TABLE public.profiles 
ALTER COLUMN display_id SET NOT NULL;