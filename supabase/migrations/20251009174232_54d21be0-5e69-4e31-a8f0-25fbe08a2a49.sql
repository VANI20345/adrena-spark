-- Create enum for friendship status
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- Create enum for friend request status
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Create enum for profile visibility
CREATE TYPE profile_visibility AS ENUM ('public', 'friends_only', 'private');

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'accepted',
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_request CHECK (sender_id != receiver_id),
  CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id)
);

-- Add columns to profiles table for privacy settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_visibility profile_visibility DEFAULT 'public',
ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_friend_requests_sender_id ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);

-- Enable Row Level Security
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships table
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can update their own friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for friend_requests table
CREATE POLICY "Users can view requests they sent or received"
ON public.friend_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Any authenticated user can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can update friend requests"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can delete their own requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Update profiles RLS to support viewing other profiles based on privacy
CREATE POLICY "Public profiles viewable by everyone"
ON public.profiles FOR SELECT
USING (profile_visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Friends-only profiles viewable by friends"
ON public.profiles FOR SELECT
USING (
  profile_visibility = 'friends_only' AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE (user_id = auth.uid() AND friend_id = profiles.user_id AND status = 'accepted')
         OR (friend_id = auth.uid() AND user_id = profiles.user_id AND status = 'accepted')
    )
  )
);

-- Add trigger for updated_at on friendships
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on friend_requests
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for friend_requests and friendships
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;