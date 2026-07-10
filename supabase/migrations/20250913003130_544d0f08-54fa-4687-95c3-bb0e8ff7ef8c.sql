-- Add function to increment event attendees
CREATE OR REPLACE FUNCTION increment_event_attendees(event_id uuid, increment_by integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events 
  SET current_attendees = COALESCE(current_attendees, 0) + increment_by
  WHERE id = event_id;
END;
$$;