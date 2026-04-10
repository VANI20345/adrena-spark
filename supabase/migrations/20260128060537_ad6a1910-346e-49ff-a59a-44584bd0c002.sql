
-- 1. Fix Events RLS: Allow organizers to create their own events
DROP POLICY IF EXISTS "Organizers can create their own events" ON public.events;
CREATE POLICY "Organizers can create their own events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

-- Also allow organizers to update their own events
DROP POLICY IF EXISTS "Organizers can update their own events" ON public.events;
CREATE POLICY "Organizers can update their own events"
ON public.events FOR UPDATE
USING (auth.uid() = organizer_id);

-- Allow organizers to view their own pending/rejected events
DROP POLICY IF EXISTS "Organizers can view their own events" ON public.events;
CREATE POLICY "Organizers can view their own events"
ON public.events FOR SELECT
USING (auth.uid() = organizer_id);

-- 2. Fix check_warning_count function - update to use user_suspensions table instead of profiles.suspended
CREATE OR REPLACE FUNCTION public.check_warning_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Increment warning count in profiles
  UPDATE profiles SET warning_count = COALESCE(warning_count, 0) + 1 WHERE user_id = NEW.user_id;
  
  -- If warning count reaches 3, create a suspension in user_suspensions table
  IF (SELECT COALESCE(warning_count, 0) FROM profiles WHERE user_id = NEW.user_id) >= 3 THEN
    -- Insert suspension record (instead of updating profiles.suspended which no longer exists)
    INSERT INTO public.user_suspensions (user_id, reason, is_active, suspended_at, suspended_by)
    VALUES (
      NEW.user_id, 
      'Auto-suspended: 3 warnings reached',
      true,
      now(),
      auth.uid()
    )
    ON CONFLICT (user_id) WHERE is_active = true
    DO UPDATE SET 
      reason = 'Auto-suspended: 3 warnings reached',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;
