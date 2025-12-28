-- Enforce service booking capacity per overlapping time range
-- Assumes services.max_capacity represents max concurrent bookings for the same time window (defaults to 1)

CREATE OR REPLACE FUNCTION public.validate_service_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_capacity integer;
  v_overlap_count integer;
  v_service_date date;
  v_start time;
  v_end time;
BEGIN
  -- If booking does not use time ranges, skip validation
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Normalize/parse inputs (supports 'YYYY-MM-DD' or full ISO strings)
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

  -- Default if service not found for any reason
  v_capacity := COALESCE(v_capacity, 1);

  SELECT COUNT(*)
  INTO v_overlap_count
  FROM public.service_bookings sb
  WHERE sb.service_id = NEW.service_id
    AND substring(sb.service_date from 1 for 10)::date = v_service_date
    AND sb.status IN ('pending', 'pending_payment', 'confirmed')
    AND sb.start_time IS NOT NULL
    AND sb.end_time IS NOT NULL
    AND (sb.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid))
    AND (sb.start_time::time < v_end AND sb.end_time::time > v_start);

  IF v_overlap_count >= v_capacity THEN
    RAISE EXCEPTION 'Time slot is fully booked';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_service_booking_capacity ON public.service_bookings;
CREATE TRIGGER trg_validate_service_booking_capacity
BEFORE INSERT OR UPDATE OF service_date, start_time, end_time, status
ON public.service_bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_service_booking_capacity();

CREATE INDEX IF NOT EXISTS idx_service_bookings_service_date
ON public.service_bookings (service_id, service_date);
