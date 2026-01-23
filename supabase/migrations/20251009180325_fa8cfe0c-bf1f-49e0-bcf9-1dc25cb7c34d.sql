-- Create friend_messages table for direct messaging
CREATE TABLE IF NOT EXISTS public.friend_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster message queries
CREATE INDEX idx_friend_messages_sender ON friend_messages(sender_id);
CREATE INDEX idx_friend_messages_receiver ON friend_messages(receiver_id);
CREATE INDEX idx_friend_messages_created_at ON friend_messages(created_at DESC);
CREATE INDEX idx_friend_messages_conversation ON friend_messages(sender_id, receiver_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_messages
CREATE POLICY "Users can view messages they sent or received"
ON public.friend_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages to friends"
ON public.friend_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_id = sender_id AND friend_id = receiver_id) 
    OR (user_id = receiver_id AND friend_id = sender_id))
    AND status = 'accepted'
  )
);

CREATE POLICY "Users can update their received messages"
ON public.friend_messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create friend_activities table
CREATE TABLE IF NOT EXISTS public.friend_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('joined_event', 'created_event', 'shared_event', 'reviewed_event')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_friend_activities_user ON friend_activities(user_id);
CREATE INDEX idx_friend_activities_event ON friend_activities(event_id);
CREATE INDEX idx_friend_activities_created_at ON friend_activities(created_at DESC);
CREATE INDEX idx_friend_activities_type ON friend_activities(activity_type);

-- Enable RLS
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_activities
CREATE POLICY "Users can view their friends' activities"
ON public.friend_activities FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_id = auth.uid() AND friend_id = friend_activities.user_id)
    OR (friend_id = auth.uid() AND user_id = friend_activities.user_id))
    AND status = 'accepted'
  )
);

CREATE POLICY "Users can create their own activities"
ON public.friend_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create event_shares table for sharing events
CREATE TABLE IF NOT EXISTS public.event_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_event_shares_event ON event_shares(event_id);
CREATE INDEX idx_event_shares_shared_by ON event_shares(shared_by);
CREATE INDEX idx_event_shares_shared_with ON event_shares(shared_with);

-- Enable RLS
ALTER TABLE public.event_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_shares
CREATE POLICY "Users can view shares they sent or received"
ON public.event_shares FOR SELECT
USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can share events with friends"
ON public.event_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_id = shared_by AND friend_id = shared_with)
    OR (user_id = shared_with AND friend_id = shared_by))
    AND status = 'accepted'
  )
);

-- Trigger to create activity when user joins event
CREATE OR REPLACE FUNCTION create_friend_activity_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    INSERT INTO friend_activities (user_id, activity_type, event_id, activity_data)
    VALUES (NEW.user_id, 'joined_event', NEW.event_id, jsonb_build_object('booking_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_friend_activity_booking
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_friend_activity_on_booking();

-- Trigger to create activity when user creates event
CREATE OR REPLACE FUNCTION create_friend_activity_on_event_create()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO friend_activities (user_id, activity_type, event_id)
    VALUES (NEW.organizer_id, 'created_event', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_friend_activity_event
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_friend_activity_on_event_create();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE friend_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;