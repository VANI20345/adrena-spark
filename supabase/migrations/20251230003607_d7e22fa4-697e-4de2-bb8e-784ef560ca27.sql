-- Add quantity column to service_bookings for capacity tracking by people count
ALTER TABLE public.service_bookings 
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Update the capacity validation trigger to use quantity (people count)
CREATE OR REPLACE FUNCTION public.validate_service_booking_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity integer;
  v_overlap_count integer;
  v_service_date date;
  v_start time;
  v_end time;
BEGIN
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  v_service_date := substring(NEW.service_date from 1 for 10)::date;
  v_start := NEW.start_time::time;
  v_end := NEW.end_time::time;

  IF v_end <= v_start THEN
    RAISE EXCEPTION 'Invalid booking time range (end must be after start)';
  END IF;

  SELECT COALESCE(s.max_capacity, 1)
  INTO v_capacity
  FROM public.services s
  WHERE s.id = NEW.service_id;

  v_capacity := COALESCE(v_capacity, 1);

  -- Sum quantity (people count) instead of just counting rows
  SELECT COALESCE(SUM(sb.quantity), 0)
  INTO v_overlap_count
  FROM public.service_bookings sb
  WHERE sb.service_id = NEW.service_id
    AND substring(sb.service_date from 1 for 10)::date = v_service_date
    AND sb.status IN ('pending', 'pending_payment', 'confirmed')
    AND sb.start_time IS NOT NULL
    AND sb.end_time IS NOT NULL
    AND (sb.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid))
    AND (sb.start_time::time < v_end AND sb.end_time::time > v_start);

  -- Check if adding NEW.quantity exceeds capacity
  IF v_overlap_count + COALESCE(NEW.quantity, 1) > v_capacity THEN
    RAISE EXCEPTION 'Time slot is fully booked';
  END IF;

  RETURN NEW;
END;
$function$;