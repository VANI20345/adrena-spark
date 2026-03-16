-- Add suspension fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id);

-- Create function to auto-expire suspensions
CREATE OR REPLACE FUNCTION check_suspension_expiry()
RETURNS trigger AS $$
BEGIN
  IF NEW.suspended = true AND NEW.suspended_until IS NOT NULL AND NEW.suspended_until < NOW() THEN
    NEW.suspended = false;
    NEW.suspended_until = NULL;
    NEW.suspension_reason = NULL;
    NEW.suspended_at = NULL;
    NEW.suspended_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-expiration
DROP TRIGGER IF EXISTS auto_expire_suspension ON profiles;
CREATE TRIGGER auto_expire_suspension
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_suspension_expiry();

-- Create view for suspended users
CREATE OR REPLACE VIEW suspended_users AS
SELECT 
  p.user_id,
  p.full_name,
  p.suspended,
  p.suspended_at,
  p.suspended_until,
  p.suspension_reason,
  p.suspended_by,
  admin_profile.full_name as suspended_by_name,
  CASE 
    WHEN p.suspended_until IS NULL THEN 'permanent'
    WHEN p.suspended_until > NOW() THEN 'active'
    ELSE 'expired'
  END as suspension_status
FROM profiles p
LEFT JOIN profiles admin_profile ON p.suspended_by = admin_profile.user_id
WHERE p.suspended = true;

-- Grant access to suspended_users view
GRANT SELECT ON suspended_users TO authenticated;

-- Update RLS policies for profiles to allow admins to manage suspensions
CREATE POLICY "Admins can update suspension fields" ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);