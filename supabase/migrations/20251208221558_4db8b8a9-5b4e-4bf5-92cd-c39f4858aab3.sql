-- Fix: Drop trigger first, then function with CASCADE

-- Drop the trigger that auto-enrolls admins to groups
DROP TRIGGER IF EXISTS on_admin_role_assigned ON user_roles;
DROP TRIGGER IF EXISTS trigger_add_new_admin_to_groups ON user_roles;

-- Now drop the function with CASCADE
DROP FUNCTION IF EXISTS add_new_admin_to_groups() CASCADE;

-- Modify setup_group_moderators to NOT add all admins
CREATE OR REPLACE FUNCTION public.setup_group_moderators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert creator as owner only - do NOT auto-add all admins
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Add policy for admins to view all group posts without being members
DROP POLICY IF EXISTS "Admins can view all group posts" ON group_posts;
CREATE POLICY "Admins can view all group posts"
ON group_posts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add policy for admins to manage all group posts
DROP POLICY IF EXISTS "Admins can manage all group posts" ON group_posts;
CREATE POLICY "Admins can manage all group posts"
ON group_posts FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add policy for admins to view all group messages without being members
DROP POLICY IF EXISTS "Admins can view all group messages" ON group_messages;
CREATE POLICY "Admins can view all group messages"
ON group_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add policy for admins to view all post comments
DROP POLICY IF EXISTS "Admins can view all post comments" ON post_comments;
CREATE POLICY "Admins can view all post comments"
ON post_comments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add policy for admins to manage all post comments
DROP POLICY IF EXISTS "Admins can manage all post comments" ON post_comments;
CREATE POLICY "Admins can manage all post comments"
ON post_comments FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);