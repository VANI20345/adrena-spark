-- ==============================================
-- 1. Fix Event Creation RLS: Allow group admins to create events with any organizer_id
-- ==============================================

-- Drop existing policies and add new ones for group event creation
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON events;
DROP POLICY IF EXISTS "Group admins can manage event schedules" ON event_schedules;
DROP POLICY IF EXISTS "Group admins can manage event interests" ON event_interests;

-- Allow group owner/admin to create events for their groups (with any organizer_id)
CREATE POLICY "Group admins can create events for their groups"
ON events FOR INSERT
WITH CHECK (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = events.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('owner', 'admin')
  )
);

-- Allow group owner/admin to update events for their groups
CREATE POLICY "Group admins can update events for their groups"
ON events FOR UPDATE
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = events.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.role IN ('owner', 'admin')
  )
);

-- Allow group owner/admin to manage event schedules for their group events
CREATE POLICY "Group admins can manage event schedules"
ON event_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = event_schedules.event_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('owner', 'admin')
  )
);

-- Allow group owner/admin to manage event interests for their group events
CREATE POLICY "Group admins can manage event interests"
ON event_interests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE e.id = event_interests.event_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('owner', 'admin')
  )
);

-- ==============================================
-- 2. Fix Anonymous Access: Allow anonymous users to view groups and group details
-- ==============================================

-- Already have "Everyone can view event groups" policy, but ensure members are viewable
-- No changes needed here - policies already allow public SELECT

-- ==============================================
-- 3. Web Admins Access: Ensure admins can access all group content without membership
-- ==============================================

-- Already have admin policies from previous migration, verify they exist
-- Drop if exists and recreate to ensure they're active

DROP POLICY IF EXISTS "Admins can view all group posts" ON group_posts;
DROP POLICY IF EXISTS "Admins can manage all group posts" ON group_posts;
DROP POLICY IF EXISTS "Admins can view all group messages" ON group_messages;
DROP POLICY IF EXISTS "Admins can view all post comments" ON post_comments;
DROP POLICY IF EXISTS "Admins can manage all post comments" ON post_comments;

-- Admins can view all group posts without being members
CREATE POLICY "Admins can view all group posts"
ON group_posts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can manage (insert/update/delete) all group posts
CREATE POLICY "Admins can manage all group posts"
ON group_posts FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can view all group messages
CREATE POLICY "Admins can view all group messages"
ON group_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can view all post comments
CREATE POLICY "Admins can view all post comments"
ON post_comments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can manage all post comments
CREATE POLICY "Admins can manage all post comments"
ON post_comments FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can view all poll options
DROP POLICY IF EXISTS "Admins can view all poll options" ON poll_options;
CREATE POLICY "Admins can view all poll options"
ON poll_options FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can view all poll votes
DROP POLICY IF EXISTS "Admins can view all poll votes" ON poll_votes;
CREATE POLICY "Admins can view all poll votes"
ON poll_votes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Admins can view all group events
DROP POLICY IF EXISTS "Admins can view all group events" ON events;
CREATE POLICY "Admins can view all group events"
ON events FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);