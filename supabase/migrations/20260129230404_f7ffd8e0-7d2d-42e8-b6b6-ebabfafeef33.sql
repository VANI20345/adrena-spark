-- ===========================================
-- FIX 1: Remove obsolete triggers that reference the removed 'suspended' column on profiles
-- ===========================================
DROP TRIGGER IF EXISTS auto_expire_suspension ON public.profiles;
DROP TRIGGER IF EXISTS check_suspension_expiry_trigger ON public.profiles;

-- Drop the obsolete function that references non-existent columns
DROP FUNCTION IF EXISTS public.check_suspension_expiry();

-- ===========================================
-- FIX 2: Drop and recreate get_suspended_users function to use user_suspensions table
-- ===========================================
DROP FUNCTION IF EXISTS public.get_suspended_users();

CREATE OR REPLACE FUNCTION public.get_suspended_users()
RETURNS TABLE(
  user_id uuid, 
  full_name text, 
  email text, 
  avatar_url text, 
  is_suspended boolean, 
  suspended_at timestamp with time zone, 
  suspended_until timestamp with time zone, 
  suspension_reason text, 
  suspended_by uuid, 
  warning_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this data
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    COALESCE((SELECT au.email FROM auth.users au WHERE au.id = p.user_id), '')::text as email,
    p.avatar_url,
    COALESCE(us.is_active, false) as is_suspended,
    us.suspended_at,
    us.suspended_until,
    us.reason as suspension_reason,
    us.suspended_by,
    COALESCE(p.warning_count, 0) as warning_count
  FROM public.profiles p
  LEFT JOIN public.user_suspensions us ON us.user_id = p.user_id AND us.is_active = true;
END;
$$;

-- ===========================================
-- FIX 3: Ensure update_follow_counts works correctly
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE public.profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE user_id = NEW.follower_id;
    -- Increment followers count for followed user
    UPDATE public.profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE user_id = NEW.following_id;
    
    -- Create notification for new follower
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      NEW.following_id,
      'new_follower',
      CASE WHEN p.full_name IS NOT NULL THEN p.full_name || ' started following you' ELSE 'Someone started following you' END,
      CASE WHEN p.full_name IS NOT NULL THEN p.full_name || ' is now following you' ELSE 'You have a new follower' END,
      jsonb_build_object('follower_id', NEW.follower_id, 'follower_name', p.full_name, 'follower_avatar', p.avatar_url)
    FROM public.profiles p WHERE p.user_id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE public.profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE user_id = OLD.follower_id;
    -- Decrement followers count for followed user
    UPDATE public.profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================
-- FIX 4: Enhanced RLS for group event creation
-- Allow group admins to create events with other group admins as organizers
-- ===========================================

-- Drop conflicting policies first
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;
DROP POLICY IF EXISTS "Users and admins can create events" ON public.events;

-- Create comprehensive insert policy for events
CREATE POLICY "Events insert policy" ON public.events
FOR INSERT
WITH CHECK (
  -- Case 1: Creating own event (not in a group)
  (auth.uid() = organizer_id AND group_id IS NULL)
  OR
  -- Case 2: System admin can create events for any admin/provider
  (has_role(auth.uid(), 'admin'::app_role) AND has_any_role(organizer_id, ARRAY['admin'::app_role, 'provider'::app_role]))
  OR
  -- Case 3: Group event - creator must be group owner/admin, organizer must also be group owner/admin
  (
    group_id IS NOT NULL
    AND (
      -- Creator is group owner
      EXISTS (
        SELECT 1 FROM groups g 
        WHERE g.id = events.group_id 
        AND g.created_by = auth.uid()
      )
      OR
      -- Creator is group admin/owner member
      EXISTS (
        SELECT 1 FROM group_memberships gm 
        WHERE gm.group_id = events.group_id 
        AND gm.user_id = auth.uid() 
        AND gm.role IN ('owner', 'admin')
      )
    )
    AND (
      -- Organizer is group owner
      EXISTS (
        SELECT 1 FROM groups g2 
        WHERE g2.id = events.group_id 
        AND g2.created_by = organizer_id
      )
      OR
      -- Organizer is group admin/owner member
      EXISTS (
        SELECT 1 FROM group_memberships gm2 
        WHERE gm2.group_id = events.group_id 
        AND gm2.user_id = organizer_id 
        AND gm2.role IN ('owner', 'admin')
      )
    )
  )
);