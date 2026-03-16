-- Create group_members table for member management
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'member',
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for group members
CREATE POLICY "Group members can view group membership" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_groups eg
    WHERE eg.id = group_members.group_id
    AND (
      -- Event participants can see members
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.event_id = eg.event_id
        AND b.user_id = auth.uid()
        AND b.status = 'confirmed'
      )
      OR 
      -- Event organizers can see members
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = eg.event_id
        AND e.organizer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.event_groups eg
    WHERE eg.id = group_members.group_id
    AND (
      -- Event participants can join
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.event_id = eg.event_id
        AND b.user_id = auth.uid()
        AND b.status = 'confirmed'
      )
      OR 
      -- Event organizers can join
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = eg.event_id
        AND e.organizer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Organizers can manage group members" 
ON public.group_members 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event_groups eg
    JOIN public.events e ON e.id = eg.event_id
    WHERE eg.id = group_members.group_id
    AND e.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.event_groups eg
    JOIN public.events e ON e.id = eg.event_id
    WHERE eg.id = group_members.group_id
    AND e.organizer_id = auth.uid()
  )
);

-- Add check-in functionality to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS checked_in_location TEXT,
ADD COLUMN IF NOT EXISTS check_in_method TEXT DEFAULT 'qr_code';

-- Function to check-in attendees
CREATE OR REPLACE FUNCTION public.check_in_attendee(
  ticket_id UUID,
  organizer_id UUID,
  location TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  ticket_record RECORD;
BEGIN
  -- Get ticket details and verify organizer
  SELECT t.*, b.event_id, e.organizer_id
  INTO ticket_record
  FROM tickets t
  JOIN bookings b ON b.id = t.booking_id
  JOIN events e ON e.id = b.event_id
  WHERE t.id = ticket_id;

  -- Check if ticket exists
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Ticket not found');
  END IF;

  -- Verify organizer
  IF ticket_record.organizer_id != organizer_id THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if already checked in
  IF ticket_record.checked_in_at IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Already checked in');
  END IF;

  -- Update ticket with check-in details
  UPDATE tickets 
  SET 
    checked_in_at = now(),
    checked_in_by = organizer_id,
    checked_in_location = location,
    check_in_method = 'qr_code',
    status = 'used'
  WHERE id = ticket_id;

  -- Return success
  RETURN JSON_BUILD_OBJECT(
    'success', true, 
    'message', 'Check-in successful',
    'ticket_id', ticket_id,
    'checked_in_at', now()
  );
END;
$$;