-- Create user_activities table for tracking user actions
CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'joined_event', 'created_event', 'joined_group', 'created_group', 'booked_service', 'post_created'
  entity_type TEXT NOT NULL, -- 'event', 'group', 'service', 'post'
  entity_id UUID NOT NULL,
  entity_data JSONB DEFAULT '{}', -- Store title, image, etc. for display
  visibility TEXT DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'private')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX idx_user_activities_entity ON public.user_activities(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activities
-- Users can view their own activities
CREATE POLICY "Users can view own activities"
ON public.user_activities FOR SELECT
USING (auth.uid() = user_id);

-- Users can view public activities
CREATE POLICY "Anyone can view public activities"
ON public.user_activities FOR SELECT
USING (visibility = 'public');

-- Users can view activities of users they follow (followers visibility)
CREATE POLICY "Followers can view follower-visible activities"
ON public.user_activities FOR SELECT
USING (
  visibility = 'followers' AND
  EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE user_follows.follower_id = auth.uid()
    AND user_follows.following_id = user_activities.user_id
  )
);

-- System/triggers can insert activities
CREATE POLICY "System can insert activities"
ON public.user_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own activities
CREATE POLICY "Users can delete own activities"
ON public.user_activities FOR DELETE
USING (auth.uid() = user_id);

-- Add RLS policies for user_follows table (ensure they exist)
-- Allow users to view all follows (for follower/following counts)
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows"
ON public.user_follows FOR SELECT
USING (true);

-- Allow users to follow others
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others"
ON public.user_follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Allow users to unfollow
DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow"
ON public.user_follows FOR DELETE
USING (auth.uid() = follower_id);

-- Function to create activity when user joins a group
CREATE OR REPLACE FUNCTION public.create_group_join_activity()
RETURNS TRIGGER AS $$
DECLARE
  group_data JSONB;
BEGIN
  -- Get group info
  SELECT jsonb_build_object(
    'group_name', group_name,
    'image_url', image_url,
    'description', description
  ) INTO group_data
  FROM public.event_groups
  WHERE id = NEW.group_id;

  -- Insert activity
  INSERT INTO public.user_activities (user_id, activity_type, entity_type, entity_id, entity_data, visibility)
  VALUES (NEW.user_id, 'joined_group', 'group', NEW.group_id, group_data, 'followers');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create activity when user creates a post
CREATE OR REPLACE FUNCTION public.create_post_activity()
RETURNS TRIGGER AS $$
DECLARE
  group_data JSONB;
BEGIN
  -- Get group info
  SELECT jsonb_build_object(
    'group_name', eg.group_name,
    'content_preview', LEFT(NEW.content, 100),
    'post_type', NEW.post_type
  ) INTO group_data
  FROM public.event_groups eg
  WHERE eg.id = NEW.group_id;

  -- Insert activity
  INSERT INTO public.user_activities (user_id, activity_type, entity_type, entity_id, entity_data, visibility)
  VALUES (NEW.user_id, 'post_created', 'post', NEW.id, group_data, 'followers');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create activity when user books an event
CREATE OR REPLACE FUNCTION public.create_event_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
  event_data JSONB;
BEGIN
  -- Only create activity for confirmed bookings
  IF NEW.status = 'confirmed' THEN
    -- Get event info
    SELECT jsonb_build_object(
      'title', title,
      'title_ar', title_ar,
      'image_url', image_url,
      'location', location,
      'start_date', start_date
    ) INTO event_data
    FROM public.events
    WHERE id = NEW.event_id;

    -- Insert activity
    INSERT INTO public.user_activities (user_id, activity_type, entity_type, entity_id, entity_data, visibility)
    VALUES (NEW.user_id, 'joined_event', 'event', NEW.event_id, event_data, 'followers');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create activity when user books a service
CREATE OR REPLACE FUNCTION public.create_service_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
  service_data JSONB;
BEGIN
  -- Only create activity for confirmed bookings
  IF NEW.status = 'confirmed' THEN
    -- Get service info
    SELECT jsonb_build_object(
      'name', name,
      'name_ar', name_ar,
      'image_url', image_url,
      'service_type', service_type
    ) INTO service_data
    FROM public.services
    WHERE id = NEW.service_id;

    -- Insert activity
    INSERT INTO public.user_activities (user_id, activity_type, entity_type, entity_id, entity_data, visibility)
    VALUES (NEW.user_id, 'booked_service', 'service', NEW.service_id, service_data, 'followers');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update follower counts
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

-- Create triggers
DROP TRIGGER IF EXISTS on_group_member_joined ON public.group_members;
CREATE TRIGGER on_group_member_joined
AFTER INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.create_group_join_activity();

DROP TRIGGER IF EXISTS on_post_created ON public.group_posts;
CREATE TRIGGER on_post_created
AFTER INSERT ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.create_post_activity();

DROP TRIGGER IF EXISTS on_event_booked ON public.bookings;
CREATE TRIGGER on_event_booked
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.create_event_booking_activity();

DROP TRIGGER IF EXISTS on_service_booked ON public.service_bookings;
CREATE TRIGGER on_service_booked
AFTER INSERT OR UPDATE ON public.service_bookings
FOR EACH ROW EXECUTE FUNCTION public.create_service_booking_activity();

DROP TRIGGER IF EXISTS on_follow_change ON public.user_follows;
CREATE TRIGGER on_follow_change
AFTER INSERT OR DELETE ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();