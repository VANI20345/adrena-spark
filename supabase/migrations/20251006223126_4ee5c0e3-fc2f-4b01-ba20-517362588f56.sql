-- =====================================================
-- PHASE 1: Database Schema Fixes
-- =====================================================

-- 1. Remove duplicate foreign key constraints
ALTER TABLE event_groups DROP CONSTRAINT IF EXISTS fk_event_groups_created_by;
ALTER TABLE event_groups DROP CONSTRAINT IF EXISTS fk_event_groups_event_id;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS fk_group_members_user_id;
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS fk_group_messages_group_id;

-- 2. Remove foreign keys to auth.users (security fix)
ALTER TABLE event_groups DROP CONSTRAINT IF EXISTS event_groups_created_by_fkey;
ALTER TABLE event_groups DROP CONSTRAINT IF EXISTS event_groups_assigned_admin_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

-- Add proper foreign keys to profiles table instead
ALTER TABLE event_groups 
ADD CONSTRAINT event_groups_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE event_groups 
ADD CONSTRAINT event_groups_assigned_admin_id_fkey 
FOREIGN KEY (assigned_admin_id) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE group_members 
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- 3. Add event existence validation for event groups
ALTER TABLE event_groups 
ADD CONSTRAINT event_groups_event_id_required_for_events 
CHECK (
  (group_type = 'region' AND event_id IS NULL) OR
  (group_type != 'region' AND event_id IS NOT NULL)
);

-- =====================================================
-- PHASE 3: RLS Policy Improvements
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can join any group" ON group_members;

-- Create new comprehensive policy for event group membership
CREATE POLICY "Users can only join event groups they're authorized for"
ON group_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    -- Allow joining regional groups
    (EXISTS (
      SELECT 1 FROM event_groups eg 
      WHERE eg.id = group_id AND eg.group_type = 'region'
    ))
    OR
    -- Allow joining if user is event organizer
    (EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN events e ON eg.event_id = e.id
      WHERE eg.id = group_id AND e.organizer_id = auth.uid()
    ))
    OR
    -- Allow joining if user is confirmed attendee
    (EXISTS (
      SELECT 1 FROM event_groups eg
      JOIN bookings b ON eg.event_id = b.event_id
      WHERE eg.id = group_id 
        AND b.user_id = auth.uid() 
        AND b.status = 'confirmed'
    ))
    OR
    -- Allow admins to join any group
    (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ))
  )
);

-- =====================================================
-- PHASE 4: Performance Improvements
-- =====================================================

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_group 
ON group_members(user_id, group_id);

CREATE INDEX IF NOT EXISTS idx_event_groups_event_id 
ON event_groups(event_id) WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_groups_type 
ON event_groups(group_type);

CREATE INDEX IF NOT EXISTS idx_bookings_user_event 
ON bookings(user_id, event_id) WHERE status = 'confirmed';