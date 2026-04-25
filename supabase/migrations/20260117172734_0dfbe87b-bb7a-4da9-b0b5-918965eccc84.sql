-- =====================================================
-- PHASE 2-3: Table Renames & Counter Views
-- =====================================================

-- =====================================================
-- PART A: CREATE RENAME ALIASES (Views for backward compatibility)
-- We'll rename tables and create views with old names for compatibility
-- =====================================================

-- 1. Rename event_groups to groups
ALTER TABLE public.event_groups RENAME TO groups;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.event_groups AS SELECT * FROM public.groups;

-- 2. Rename group_members to group_memberships
ALTER TABLE public.group_members RENAME TO group_memberships;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.group_members AS SELECT * FROM public.group_memberships;

-- 3. Rename group_posts to posts
ALTER TABLE public.group_posts RENAME TO posts;

-- Create alias view for backward compatibility  
CREATE OR REPLACE VIEW public.group_posts AS SELECT * FROM public.posts;

-- 4. Rename post_likes to post_reactions
ALTER TABLE public.post_likes RENAME TO post_reactions;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.post_likes AS SELECT * FROM public.post_reactions;

-- 5. Rename post_comments to comments
ALTER TABLE public.post_comments RENAME TO comments;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.post_comments AS SELECT * FROM public.comments;

-- 6. Rename user_interests to interest_categories (this is the lookup table)
ALTER TABLE public.user_interests RENAME TO interest_categories;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.user_interests AS SELECT * FROM public.interest_categories;

-- 7. Rename user_follows to follows
ALTER TABLE public.user_follows RENAME TO follows;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.user_follows AS SELECT * FROM public.follows;

-- 8. Rename event_bookmarks to bookmarks (generalized)
ALTER TABLE public.event_bookmarks RENAME TO bookmarks;

-- Add entity_type column for future expansion (services, etc.)
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'event';

-- Rename event_id to entity_id for generalization
ALTER TABLE public.bookmarks RENAME COLUMN event_id TO entity_id;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.event_bookmarks AS 
SELECT id, entity_id as event_id, user_id, created_at 
FROM public.bookmarks 
WHERE entity_type = 'event';

-- 9. Rename direct_messages to messages
ALTER TABLE public.direct_messages RENAME TO messages;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.direct_messages AS SELECT * FROM public.messages;

-- 10. Rename group_messages to group_chat_messages
ALTER TABLE public.group_messages RENAME TO group_chat_messages;

-- Create alias view for backward compatibility
CREATE OR REPLACE VIEW public.group_messages AS SELECT * FROM public.group_chat_messages;

-- =====================================================
-- PART B: Create Counter Views (replacing denormalized columns)
-- =====================================================

-- 1. Profile follower/following counts view
CREATE OR REPLACE VIEW public.profile_counts AS
SELECT 
  p.user_id,
  COALESCE(f1.followers_count, 0) as followers_count,
  COALESCE(f2.following_count, 0) as following_count
FROM public.profiles p
LEFT JOIN (
  SELECT following_id as user_id, COUNT(*) as followers_count
  FROM public.follows
  GROUP BY following_id
) f1 ON f1.user_id = p.user_id
LEFT JOIN (
  SELECT follower_id as user_id, COUNT(*) as following_count
  FROM public.follows
  GROUP BY follower_id
) f2 ON f2.user_id = p.user_id;

-- 2. Group member counts view
CREATE OR REPLACE VIEW public.group_counts AS
SELECT 
  g.id as group_id,
  COUNT(gm.id) as member_count
FROM public.groups g
LEFT JOIN public.group_memberships gm ON gm.group_id = g.id
GROUP BY g.id;

-- 3. Category event counts view
CREATE OR REPLACE VIEW public.category_counts AS
SELECT 
  c.id as category_id,
  COUNT(e.id) as event_count
FROM public.categories c
LEFT JOIN public.events e ON e.category_id = c.id AND e.status = 'approved'
GROUP BY c.id;

-- 4. Event attendee counts view
CREATE OR REPLACE VIEW public.event_attendee_counts AS
SELECT 
  e.id as event_id,
  COALESCE(SUM(b.quantity), 0)::integer as current_attendees
FROM public.events e
LEFT JOIN public.bookings b ON b.event_id = e.id AND b.status = 'confirmed'
GROUP BY e.id;

-- 5. Post engagement counts view
CREATE OR REPLACE VIEW public.post_counts AS
SELECT 
  p.id as post_id,
  COALESCE(l.likes_count, 0) as likes_count,
  COALESCE(c.comments_count, 0) as comments_count
FROM public.posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) as likes_count
  FROM public.post_reactions
  GROUP BY post_id
) l ON l.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as comments_count
  FROM public.comments
  GROUP BY post_id
) c ON c.post_id = p.id;

-- 6. Poll option vote counts view
CREATE OR REPLACE VIEW public.poll_option_counts AS
SELECT 
  po.id as option_id,
  COUNT(pv.id) as votes_count
FROM public.poll_options po
LEFT JOIN public.poll_votes pv ON pv.option_id = po.id
GROUP BY po.id;

-- =====================================================
-- PART C: Update Foreign Key References
-- =====================================================

-- Update FK references in group_message_attachments
ALTER TABLE public.group_message_attachments 
  DROP CONSTRAINT IF EXISTS group_message_attachments_message_id_fkey;

ALTER TABLE public.group_message_attachments
  ADD CONSTRAINT group_message_attachments_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES public.group_chat_messages(id) ON DELETE CASCADE;

-- Update FK references in group_memberships
ALTER TABLE public.group_memberships
  DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;

ALTER TABLE public.group_memberships
  ADD CONSTRAINT group_memberships_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update FK references in group_join_requests
ALTER TABLE public.group_join_requests
  DROP CONSTRAINT IF EXISTS group_join_requests_group_id_fkey;

ALTER TABLE public.group_join_requests
  ADD CONSTRAINT group_join_requests_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update FK references in group_interests
ALTER TABLE public.group_interests
  DROP CONSTRAINT IF EXISTS group_interests_group_id_fkey;

ALTER TABLE public.group_interests
  ADD CONSTRAINT group_interests_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update FK references in posts
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS group_posts_group_id_fkey;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update FK references in group_chat_messages
ALTER TABLE public.group_chat_messages
  DROP CONSTRAINT IF EXISTS group_messages_group_id_fkey;

ALTER TABLE public.group_chat_messages
  ADD CONSTRAINT group_chat_messages_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Update FK references in events
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_group_id_fkey;

ALTER TABLE public.events
  ADD CONSTRAINT events_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Update FK references in comments
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Update FK references in post_reactions
ALTER TABLE public.post_reactions
  DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

ALTER TABLE public.post_reactions
  ADD CONSTRAINT post_reactions_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Update FK references in poll_options
ALTER TABLE public.poll_options
  DROP CONSTRAINT IF EXISTS poll_options_post_id_fkey;

ALTER TABLE public.poll_options
  ADD CONSTRAINT poll_options_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Update FK references in poll_votes
ALTER TABLE public.poll_votes
  DROP CONSTRAINT IF EXISTS poll_votes_post_id_fkey;

ALTER TABLE public.poll_votes
  ADD CONSTRAINT poll_votes_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- =====================================================
-- PART D: Create new indexes on renamed tables
-- =====================================================

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON public.groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_category_id ON public.groups(category_id);

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON public.group_memberships(role);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON public.posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Post reactions indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Group chat messages indexes
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_id ON public.group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_sender_id ON public.group_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created_at ON public.group_chat_messages(created_at DESC);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_entity_id ON public.bookmarks(entity_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_entity_type ON public.bookmarks(entity_type);