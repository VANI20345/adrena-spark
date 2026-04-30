
-- Update can_view_profile() to use user_privacy_settings and include super_admin
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN user_privacy_settings ups ON ups.user_id = p.user_id
    WHERE p.user_id = target_user_id
    AND (
      p.user_id = auth.uid()
      OR
      COALESCE(ups.profile_visibility, 'public') = 'public'
      OR
      EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
        AND following_id = target_user_id
      )
      OR
      EXISTS (
        SELECT 1 FROM group_memberships gm1
        JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = target_user_id
      )
      OR
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin'::app_role, 'super_admin'::app_role)
      )
    )
  );
$function$;

-- Update can_view_full_profile() to include super_admin
CREATE OR REPLACE FUNCTION public.can_view_full_profile(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    auth.uid() = _target_user_id
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin'::app_role, 'super_admin'::app_role)
    )
    OR
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE user_follows.follower_id = auth.uid()
        AND user_follows.following_id = _target_user_id
    )
$function$;
