
-- Unschedule existing job if present (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-holds-ready-for-review-hourly') THEN
    PERFORM cron.unschedule('mark-holds-ready-for-review-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'mark-holds-ready-for-review-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nzuppbjtxmfrgutyagev.supabase.co/functions/v1/mark-holds-ready-for-review',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dXBwYmp0eG1mcmd1dHlhZ2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNzc2MTUsImV4cCI6MjA3MTc1MzYxNX0.9IbzvPg2YWMDBj9SQ5QXz7GAQmWV4VCzIJJpct72KG8',
      'x-internal-secret', COALESCE(current_setting('app.internal_secret', true), 'unset')
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $cron$
);
