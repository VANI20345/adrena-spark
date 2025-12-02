-- Performance optimization indexes (Fixed version without PostGIS dependency)
-- These indexes will significantly improve query performance for frequently accessed data

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(featured) WHERE featured = true;
-- Simple lat/long indexes for location-based queries (alternative to PostGIS)
CREATE INDEX IF NOT EXISTS idx_events_latitude ON public.events(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_longitude ON public.events(longitude) WHERE longitude IS NOT NULL;

-- Services table indexes
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_provider ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category_id);

-- Service categories indexes
CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON public.service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON public.service_categories(is_active) WHERE is_active = true;

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON public.bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON public.bookings(created_at DESC);

-- Service bookings indexes
CREATE INDEX IF NOT EXISTS idx_service_bookings_user ON public.service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service ON public.service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON public.service_bookings(status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_id ON public.profiles(display_id);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended) WHERE suspended = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_event ON public.reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Group members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- Group messages indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON public.group_messages(created_at DESC);

-- Loyalty ledger indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON public.loyalty_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_expires ON public.loyalty_ledger(expires_at) WHERE expires_at IS NOT NULL;

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON public.tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON public.tickets(checked_in_at) WHERE checked_in_at IS NOT NULL;

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Event groups indexes
CREATE INDEX IF NOT EXISTS idx_event_groups_event ON public.event_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_groups_type ON public.event_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_event_groups_archived ON public.event_groups(archived_at) WHERE archived_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_status_dates ON public.events(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON public.bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Add comments for documentation
COMMENT ON INDEX idx_events_status IS 'Improves event filtering by status';
COMMENT ON INDEX idx_bookings_user_status IS 'Optimizes user booking history queries';
COMMENT ON INDEX idx_notifications_user_read IS 'Speeds up unread notification queries';
