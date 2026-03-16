-- ====================================
-- Performance Optimization Indexes
-- ====================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_id ON profiles(display_id);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(suspended) WHERE suspended = true;

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_both ON followers(follower_id, following_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_status_dates ON events(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured) WHERE featured = true;

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_id, status);

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_both_users ON friendships(user_id, friend_id);

-- Group members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- Group messages indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);

-- Event groups indexes
CREATE INDEX IF NOT EXISTS idx_event_groups_event_id ON event_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_groups_type ON event_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_event_groups_admin ON event_groups(assigned_admin_id);

-- Friend messages indexes
CREATE INDEX IF NOT EXISTS idx_friend_messages_sender ON friend_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_receiver ON friend_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_messages_read ON friend_messages(read) WHERE read = false;

-- Reported messages indexes
CREATE INDEX IF NOT EXISTS idx_reported_messages_status ON reported_messages(status);
CREATE INDEX IF NOT EXISTS idx_reported_messages_reporter ON reported_messages(reported_by);

-- Admin activity logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_activity_logs(created_at DESC);

-- Analyze tables for better query planning
ANALYZE profiles;
ANALYZE user_roles;
ANALYZE followers;
ANALYZE events;
ANALYZE services;
ANALYZE bookings;
ANALYZE notifications;
ANALYZE friend_requests;
ANALYZE friendships;
ANALYZE group_members;
ANALYZE group_messages;