-- ========================================
-- PHASE 8-9: Cleanup & Comprehensive Indexes
-- ========================================

-- Drop unused tables (if they exist and have no data)
DO $$
BEGIN
  -- Check and drop friend_group_chats if empty
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friend_group_chats') THEN
    IF NOT EXISTS (SELECT 1 FROM public.friend_group_chats LIMIT 1) THEN
      DROP TABLE IF EXISTS public.friend_group_chat_messages CASCADE;
      DROP TABLE IF EXISTS public.friend_group_chat_members CASCADE;
      DROP TABLE IF EXISTS public.friend_group_chats CASCADE;
      RAISE NOTICE 'Dropped unused friend_group_chat tables';
    END IF;
  END IF;
  
  -- Check and drop regional_groups if empty
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regional_groups') THEN
    IF NOT EXISTS (SELECT 1 FROM public.regional_groups LIMIT 1) THEN
      DROP TABLE IF EXISTS public.regional_groups CASCADE;
      RAISE NOTICE 'Dropped unused regional_groups table';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop some tables: %', SQLERRM;
END;
$$;

-- Create proper indexes for common query patterns

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_display_id ON public.profiles(display_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles(verification_status);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON public.events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status_start ON public.events(status, start_date);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(featured) WHERE featured = true;

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON public.bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON public.bookings(event_id, status);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_city_id ON public.services(city_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON public.services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_featured ON public.services(featured) WHERE featured = true;

-- Service bookings indexes
CREATE INDEX IF NOT EXISTS idx_service_bookings_user_id ON public.service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service_id ON public.service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON public.service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_date ON public.service_bookings(service_date);

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_category_id ON public.groups(category_id);
CREATE INDEX IF NOT EXISTS idx_groups_city_id ON public.groups(city_id);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON public.groups(visibility);

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON public.group_memberships(role);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON public.posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_created ON public.posts(group_id, created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);

-- Post reactions indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Follow requests indexes
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON public.follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON public.follow_requests(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON public.conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON public.conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_event_id ON public.reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON public.tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- User suspensions indexes
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user ON public.user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON public.user_suspensions(user_id) WHERE is_active = true;

-- User warnings indexes
CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON public.user_warnings(user_id);

-- Loyalty ledger indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON public.loyalty_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_type ON public.loyalty_ledger(type);

-- Wallet transactions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);

-- Lookup tables indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_service_categories_name ON public.service_categories(name);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_active ON public.cities(is_active) WHERE is_active = true;

-- Training sets indexes
CREATE INDEX IF NOT EXISTS idx_training_sets_service ON public.training_sets(service_id);
CREATE INDEX IF NOT EXISTS idx_training_sets_date ON public.training_sets(set_date);

-- Group chat messages indexes
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group ON public.group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_sender ON public.group_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created ON public.group_chat_messages(created_at DESC);

-- Group join requests indexes
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group ON public.group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user ON public.group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON public.group_join_requests(status);

-- Poll votes indexes
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);

-- Bookmarks indexes  
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_entity ON public.bookmarks(entity_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON public.bookmarks(entity_type);

-- User badges indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);

-- Provider verifications indexes
CREATE INDEX IF NOT EXISTS idx_provider_verifications_user ON public.provider_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_verifications_status ON public.provider_verifications(verification_status);

-- User gamification indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_user ON public.user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_referral ON public.user_gamification(referral_code);

-- User privacy settings indexes
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user ON public.user_privacy_settings(user_id);

-- Profile contacts indexes
CREATE INDEX IF NOT EXISTS idx_profile_contacts_user ON public.profile_contacts(user_id);

-- Leaderboard entries indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON public.leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_period ON public.leaderboard_entries(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON public.leaderboard_entries(rank);

-- Reported messages indexes
CREATE INDEX IF NOT EXISTS idx_reported_messages_reporter ON public.reported_messages(reported_by);
CREATE INDEX IF NOT EXISTS idx_reported_messages_sender ON public.reported_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_reported_messages_status ON public.reported_messages(status);

-- Contact submissions indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_category ON public.contact_submissions(category);

-- User reports indexes
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);

-- Coupons indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Refunds indexes
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON public.refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- Event schedules indexes
CREATE INDEX IF NOT EXISTS idx_event_schedules_event ON public.event_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_date ON public.event_schedules(schedule_date);

-- Pricing plans indexes
CREATE INDEX IF NOT EXISTS idx_pricing_plans_event ON public.pricing_plans(event_id);

-- Rating summaries indexes
CREATE INDEX IF NOT EXISTS idx_rating_summaries_entity ON public.rating_summaries(entity_type, entity_id);

-- Service requests indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_event ON public.service_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_service ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

-- Add comment explaining the normalized structure
COMMENT ON TABLE public.training_service_details IS 'Normalized table containing training-specific service attributes (3NF)';
COMMENT ON TABLE public.discount_service_details IS 'Normalized table containing discount-specific service attributes (3NF)';
COMMENT ON TABLE public.service_schedules IS 'Normalized table containing service availability schedules (3NF)';
COMMENT ON TABLE public.activity_logs IS 'Unified activity tracking table combining user and admin activities (3NF)';
COMMENT ON TABLE public.profile_contacts IS 'Normalized table containing sensitive contact information (3NF)';
COMMENT ON TABLE public.provider_verifications IS 'Normalized table containing provider verification data (3NF)';
COMMENT ON TABLE public.user_suspensions IS 'Normalized table tracking user suspension history (3NF)';
COMMENT ON TABLE public.user_gamification IS 'Normalized table containing gamification/points data (3NF)';
COMMENT ON TABLE public.user_privacy_settings IS 'Normalized table containing privacy preferences (3NF)';