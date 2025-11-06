-- Create group_messages table for chat functionality
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for group messages
CREATE POLICY "Group members can view messages" 
ON public.group_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_groups eg
    WHERE eg.id = group_messages.group_id
    AND (
      -- Event participants can see messages
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.event_id = eg.event_id
        AND b.user_id = auth.uid()
        AND b.status = 'confirmed'
      )
      OR 
      -- Event organizers can see messages
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = eg.event_id
        AND e.organizer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Group members can create messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.event_groups eg
    WHERE eg.id = group_messages.group_id
    AND (
      -- Event participants can send messages
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.event_id = eg.event_id
        AND b.user_id = auth.uid()
        AND b.status = 'confirmed'
      )
      OR 
      -- Event organizers can send messages
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = eg.event_id
        AND e.organizer_id = auth.uid()
      )
    )
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();