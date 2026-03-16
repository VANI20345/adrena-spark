-- ================================================
-- FOLLOW REQUESTS TABLE (for private profiles)
-- ================================================
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, target_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own requests
CREATE POLICY "Users can view their follow requests"
ON public.follow_requests FOR SELECT
USING (auth.uid() = requester_id);

-- Target users can view requests to them
CREATE POLICY "Users can view incoming follow requests"
ON public.follow_requests FOR SELECT
USING (auth.uid() = target_id);

-- Users can create follow requests
CREATE POLICY "Users can send follow requests"
ON public.follow_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Target users can update (approve/reject) requests
CREATE POLICY "Users can respond to follow requests"
ON public.follow_requests FOR UPDATE
USING (auth.uid() = target_id);

-- Requesters can delete their pending requests
CREATE POLICY "Users can cancel pending requests"
ON public.follow_requests FOR DELETE
USING (auth.uid() = requester_id AND status = 'pending');

-- ================================================
-- CONVERSATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants can view their conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Users can create conversations
CREATE POLICY "Users can start conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IN (participant_1, participant_2));

-- Participants can update their conversations
CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- ================================================
-- DIRECT MESSAGES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
ON public.direct_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = direct_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Participants can send messages
CREATE POLICY "Users can send dm messages"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = direct_messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Sender can update their messages
CREATE POLICY "Users can edit own dm messages"
ON public.direct_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- ================================================
-- UPDATE CONVERSATION TIMESTAMP TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.direct_messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for DMs
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;