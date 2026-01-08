-- Add last_activity to profiles for DAU/MAU calculation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now();

-- Create user_warnings table
CREATE TABLE IF NOT EXISTS user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  reason text NOT NULL,
  content text NOT NULL,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_warnings
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

-- Users can view their own warnings
CREATE POLICY "Users can view their own warnings"
ON user_warnings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own warnings (acknowledge)
CREATE POLICY "Users can acknowledge their own warnings"
ON user_warnings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can create warnings
CREATE POLICY "Admins can create warnings"
ON user_warnings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Admins can view all warnings
CREATE POLICY "Admins can view all warnings"
ON user_warnings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Add warning_count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count integer DEFAULT 0;

-- Create trigger function to auto-suspend after 3 warnings
CREATE OR REPLACE FUNCTION check_warning_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET warning_count = warning_count + 1 WHERE user_id = NEW.user_id;
  
  IF (SELECT warning_count FROM profiles WHERE user_id = NEW.user_id) >= 3 THEN
    UPDATE profiles 
    SET suspended = true, 
        suspension_reason = 'Auto-suspended: 3 warnings reached',
        suspended_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for warning count
DROP TRIGGER IF EXISTS warning_count_trigger ON user_warnings;
CREATE TRIGGER warning_count_trigger
AFTER INSERT ON user_warnings
FOR EACH ROW EXECUTE FUNCTION check_warning_count();