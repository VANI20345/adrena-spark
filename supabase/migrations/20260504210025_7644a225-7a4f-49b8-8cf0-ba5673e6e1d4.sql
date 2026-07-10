CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper that fetches a secret from Vault by name, returning empty string if missing.
CREATE OR REPLACE FUNCTION public._vault_secret(p_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT COALESCE(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_name LIMIT 1),
    ''
  );
$$;
REVOKE ALL ON FUNCTION public._vault_secret(text) FROM PUBLIC, anon, authenticated;

-- Drop existing schedules if they exist
DO $$
BEGIN
  PERFORM cron.unschedule('mark-holds-ready-for-review-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-bookings-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Hourly: mark holds ready for review
SELECT cron.schedule(
  'mark-holds-ready-for-review-hourly',
  '0 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://nzuppbjtxmfrgutyagev.supabase.co/functions/v1/mark-holds-ready-for-review',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', public._vault_secret('INTERNAL_SECRET')
      ),
      body := jsonb_build_object('triggered_at', now())
    );
  $cron$
);

-- Every 5 minutes: cleanup expired pending bookings (event + service)
SELECT cron.schedule(
  'cleanup-expired-bookings-5min',
  '*/5 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://nzuppbjtxmfrgutyagev.supabase.co/functions/v1/cleanup-expired-bookings',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', public._vault_secret('INTERNAL_SECRET')
      ),
      body := jsonb_build_object('triggered_at', now())
    );
  $cron$
);