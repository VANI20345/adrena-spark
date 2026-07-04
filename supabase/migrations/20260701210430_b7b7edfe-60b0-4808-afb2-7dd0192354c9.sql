
-- 1) Allow anonymous visitors to see all non-archived groups on discovery/hero
DROP POLICY IF EXISTS "Anonymous can view public groups" ON public.groups;
CREATE POLICY "Anonymous can view non-archived groups"
ON public.groups
FOR SELECT
TO anon
USING (archived_at IS NULL);

-- 2) Schedule automatic release of expired pending_payment reservations every minute
SELECT cron.unschedule('cleanup-expired-booking-reservations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-booking-reservations');

SELECT cron.schedule(
  'cleanup-expired-booking-reservations',
  '* * * * *',
  $$ SELECT public.cleanup_expired_booking_reservations(); $$
);
