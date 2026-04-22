-- Fix the check_suspension_expiry trigger to be BEFORE UPDATE/INSERT
-- This ensures suspensions are checked and auto-unsuspended before the row is updated

DROP TRIGGER IF EXISTS check_suspension_expiry_trigger ON public.profiles;

-- Recreate the trigger to run BEFORE update or insert
CREATE TRIGGER check_suspension_expiry_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_suspension_expiry();

-- Add index for better performance on suspended users queries
CREATE INDEX IF NOT EXISTS idx_profiles_suspension ON public.profiles(suspended, suspended_until) WHERE suspended = true;