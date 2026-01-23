-- Fix SECURITY DEFINER view issue - recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.services_complete;
CREATE OR REPLACE VIEW public.services_complete WITH (security_invoker=on) AS
SELECT 
  s.*,
  tsd.trainer_name AS detail_trainer_name,
  tsd.training_level AS detail_training_level,
  tsd.duration_minutes AS detail_duration_minutes,
  tsd.max_capacity AS detail_max_capacity,
  tsd.number_of_sets AS detail_number_of_sets,
  tsd.duration_per_set AS detail_duration_per_set,
  tsd.provided_services AS detail_provided_services,
  dsd.original_price AS detail_original_price,
  dsd.discount_percentage AS detail_discount_percentage,
  dsd.valid_from AS detail_valid_from,
  dsd.valid_until AS detail_valid_until,
  ss.availability_type AS schedule_availability_type,
  ss.available_from AS schedule_available_from,
  ss.available_to AS schedule_available_to,
  ss.booking_duration_minutes AS schedule_booking_duration_minutes,
  ss.weekly_schedule AS schedule_weekly_schedule,
  ss.available_forever AS schedule_available_forever
FROM public.services s
LEFT JOIN public.training_service_details tsd ON tsd.service_id = s.id
LEFT JOIN public.discount_service_details dsd ON dsd.service_id = s.id
LEFT JOIN public.service_schedules ss ON ss.service_id = s.id;

-- ========================================
-- PHASE 5: Consolidate Activity Tables
-- ========================================

-- Create unified activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_data jsonb,
  visibility text DEFAULT 'followers',
  is_admin_action boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_visibility ON public.activity_logs(visibility);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON public.activity_logs(is_admin_action) WHERE is_admin_action = true;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- Migrate from user_activities (entity_id is text)
INSERT INTO public.activity_logs (actor_id, activity_type, entity_type, entity_id, entity_data, visibility, is_admin_action, created_at)
SELECT user_id, activity_type, entity_type, entity_id, entity_data, COALESCE(visibility, 'followers'), false, COALESCE(created_at, now())
FROM public.user_activities
WHERE entity_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate from admin_activity_logs (entity_id is text)
INSERT INTO public.activity_logs (actor_id, activity_type, entity_type, entity_id, entity_data, visibility, is_admin_action, created_at)
SELECT admin_id, action, entity_type, entity_id, details, 'admin', true, COALESCE(created_at, now())
FROM public.admin_activity_logs
WHERE entity_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Users can view public activities" ON public.activity_logs 
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view own activities" ON public.activity_logs 
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY "Users can view followers activities" ON public.activity_logs 
  FOR SELECT USING (
    visibility = 'followers' AND 
    EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = actor_id)
  );

CREATE POLICY "Admins can view all activities" ON public.activity_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert activities" ON public.activity_logs 
  FOR INSERT WITH CHECK (true);

-- Create backward-compatible views for user_activities and admin_activity_logs
CREATE OR REPLACE VIEW public.user_activities_view WITH (security_invoker=on) AS
SELECT id, actor_id AS user_id, activity_type, entity_type, entity_id, entity_data, visibility, created_at
FROM public.activity_logs
WHERE is_admin_action = false;

CREATE OR REPLACE VIEW public.admin_activity_logs_view WITH (security_invoker=on) AS
SELECT id, actor_id AS admin_id, activity_type AS action, entity_type, entity_id, entity_data AS details, created_at
FROM public.activity_logs
WHERE is_admin_action = true;

-- ========================================
-- PHASE 6-7: FK Standardization & Constraints
-- ========================================

-- Add missing FK constraints (only if they don't exist)
DO $$
BEGIN
  -- bookings.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_user') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT fk_bookings_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- notifications.user_id -> profiles.user_id  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_wallets.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_wallets_user') THEN
    ALTER TABLE public.user_wallets ADD CONSTRAINT fk_user_wallets_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- wallet_transactions.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_transactions_user') THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT fk_wallet_transactions_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- reviews.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_user') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT fk_reviews_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_badges.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_badges_user') THEN
    ALTER TABLE public.user_badges ADD CONSTRAINT fk_user_badges_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- loyalty_ledger.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_loyalty_ledger_user') THEN
    ALTER TABLE public.loyalty_ledger ADD CONSTRAINT fk_loyalty_ledger_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- notification_preferences.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_preferences_user') THEN
    ALTER TABLE public.notification_preferences ADD CONSTRAINT fk_notification_preferences_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_roles.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- follows.follower_id and following_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follows_follower') THEN
    ALTER TABLE public.follows ADD CONSTRAINT fk_follows_follower 
      FOREIGN KEY (follower_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follows_following') THEN
    ALTER TABLE public.follows ADD CONSTRAINT fk_follows_following 
      FOREIGN KEY (following_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- service_bookings.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_bookings_user') THEN
    ALTER TABLE public.service_bookings ADD CONSTRAINT fk_service_bookings_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- service_bookings.service_id -> services.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_bookings_service') THEN
    ALTER TABLE public.service_bookings ADD CONSTRAINT fk_service_bookings_service 
      FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
  END IF;
  
  -- user_gamification.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_gamification_user') THEN
    ALTER TABLE public.user_gamification ADD CONSTRAINT fk_user_gamification_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_privacy_settings.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_privacy_settings_user') THEN
    ALTER TABLE public.user_privacy_settings ADD CONSTRAINT fk_user_privacy_settings_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_suspensions.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_suspensions_user') THEN
    ALTER TABLE public.user_suspensions ADD CONSTRAINT fk_user_suspensions_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_warnings.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_warnings_user') THEN
    ALTER TABLE public.user_warnings ADD CONSTRAINT fk_user_warnings_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_reports.reporter_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_reports_reporter') THEN
    ALTER TABLE public.user_reports ADD CONSTRAINT fk_user_reports_reporter 
      FOREIGN KEY (reporter_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- user_reports.reported_user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_reports_reported') THEN
    ALTER TABLE public.user_reports ADD CONSTRAINT fk_user_reports_reported 
      FOREIGN KEY (reported_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- support_tickets.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_support_tickets_user') THEN
    ALTER TABLE public.support_tickets ADD CONSTRAINT fk_support_tickets_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- activity_logs.actor_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_logs_actor') THEN
    ALTER TABLE public.activity_logs ADD CONSTRAINT fk_activity_logs_actor 
      FOREIGN KEY (actor_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- bookmarks.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookmarks_user') THEN
    ALTER TABLE public.bookmarks ADD CONSTRAINT fk_bookmarks_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  -- comments.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_user') THEN
    ALTER TABLE public.comments ADD CONSTRAINT fk_comments_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- post_reactions.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_post_reactions_user') THEN
    ALTER TABLE public.post_reactions ADD CONSTRAINT fk_post_reactions_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- poll_votes.user_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_poll_votes_user') THEN
    ALTER TABLE public.poll_votes ADD CONSTRAINT fk_poll_votes_user 
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  -- messages.sender_id -> profiles.user_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sender') THEN
    ALTER TABLE public.messages ADD CONSTRAINT fk_messages_sender 
      FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some FK constraints could not be added: %', SQLERRM;
END;
$$;