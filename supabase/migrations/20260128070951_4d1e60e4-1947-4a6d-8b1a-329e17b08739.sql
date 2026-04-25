
-- Fix 1: Update RLS policy to allow group admins to create events with any other group admin as organizer
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;
CREATE POLICY "Group admins can create events for their groups" ON public.events
FOR INSERT
WITH CHECK (
  (group_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = events.group_id 
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
  ) AND (
    -- The selected organizer must also be a group admin/owner
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = events.group_id 
      AND group_memberships.user_id = events.organizer_id
      AND group_memberships.role IN ('owner', 'admin')
    )
  )
);

-- Fix 2: Add reservation_expires_at column to bookings for 15-minute reservation timeout
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;

-- Fix 3: Create function to clean up expired booking reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_booking_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer := 0;
  booking_record RECORD;
BEGIN
  -- Find all expired pending_payment bookings
  FOR booking_record IN
    SELECT id, event_id, quantity
    FROM public.bookings
    WHERE status = 'pending_payment'
    AND reservation_expires_at IS NOT NULL
    AND reservation_expires_at < NOW()
  LOOP
    -- Decrement event attendees count
    UPDATE public.events
    SET current_attendees = GREATEST(0, COALESCE(current_attendees, 0) - booking_record.quantity)
    WHERE id = booking_record.event_id;
    
    -- Mark booking as expired
    UPDATE public.bookings
    SET status = 'expired'
    WHERE id = booking_record.id;
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$;

-- Fix 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reservation_expires 
ON public.bookings(reservation_expires_at) 
WHERE status = 'pending_payment' AND reservation_expires_at IS NOT NULL;
