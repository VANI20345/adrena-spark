-- Set a test user as admin to test the admin functionality
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '1dd7c977-0ad0-438f-bce4-812ff1ef2e77';

-- If no role exists, insert it
INSERT INTO user_roles (user_id, role) 
SELECT '1dd7c977-0ad0-438f-bce4-812ff1ef2e77', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = '1dd7c977-0ad0-438f-bce4-812ff1ef2e77'
);

-- Check if admin role exists in the enum, if not we need to add it
DO $$
BEGIN
  BEGIN
    ALTER TYPE app_role ADD VALUE 'admin';
  EXCEPTION
    WHEN duplicate_object THEN null;
  END;
END $$;