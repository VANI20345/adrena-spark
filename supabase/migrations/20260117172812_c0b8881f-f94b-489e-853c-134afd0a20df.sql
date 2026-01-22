-- =====================================================
-- FIX: Set all backward compatibility views to use security_invoker
-- =====================================================

-- Fix compatibility views
DROP VIEW IF EXISTS public.event_groups;
CREATE VIEW public.event_groups WITH (security_invoker=on) AS SELECT * FROM public.groups;

DROP VIEW IF EXISTS public.group_members;
CREATE VIEW public.group_members WITH (security_invoker=on) AS SELECT * FROM public.group_memberships;

DROP VIEW IF EXISTS public.group_posts;
CREATE VIEW public.group_posts WITH (security_invoker=on) AS SELECT * FROM public.posts;

DROP VIEW IF EXISTS public.post_likes;
CREATE VIEW public.post_likes WITH (security_invoker=on) AS SELECT * FROM public.post_reactions;

DROP VIEW IF EXISTS public.post_comments;
CREATE VIEW public.post_comments WITH (security_invoker=on) AS SELECT * FROM public.comments;

DROP VIEW IF EXISTS public.user_interests;
CREATE VIEW public.user_interests WITH (security_invoker=on) AS SELECT * FROM public.interest_categories;

DROP VIEW IF EXISTS public.user_follows;
CREATE VIEW public.user_follows WITH (security_invoker=on) AS SELECT * FROM public.follows;

DROP VIEW IF EXISTS public.event_bookmarks;
CREATE VIEW public.event_bookmarks WITH (security_invoker=on) AS 
SELECT id, entity_id as event_id, user_id, created_at 
FROM public.bookmarks 
WHERE entity_type = 'event';

DROP VIEW IF EXISTS public.direct_messages;
CREATE VIEW public.direct_messages WITH (security_invoker=on) AS SELECT * FROM public.messages;

DROP VIEW IF EXISTS public.group_messages;
CREATE VIEW public.group_messages WITH (security_invoker=on) AS SELECT * FROM public.group_chat_messages;

-- Fix count views
DROP VIEW IF EXISTS public.profile_counts;
CREATE VIEW public.profile_counts WITH (security_invoker=on) AS
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

DROP VIEW IF EXISTS public.group_counts;
CREATE VIEW public.group_counts WITH (security_invoker=on) AS
SELECT 
  g.id as group_id,
  COUNT(gm.id) as member_count
FROM public.groups g
LEFT JOIN public.group_memberships gm ON gm.group_id = g.id
GROUP BY g.id;

DROP VIEW IF EXISTS public.category_counts;
CREATE VIEW public.category_counts WITH (security_invoker=on) AS
SELECT 
  c.id as category_id,
  COUNT(e.id) as event_count
FROM public.categories c
LEFT JOIN public.events e ON e.category_id = c.id AND e.status = 'approved'
GROUP BY c.id;

DROP VIEW IF EXISTS public.event_attendee_counts;
CREATE VIEW public.event_attendee_counts WITH (security_invoker=on) AS
SELECT 
  e.id as event_id,
  COALESCE(SUM(b.quantity), 0)::integer as current_attendees
FROM public.events e
LEFT JOIN public.bookings b ON b.event_id = e.id AND b.status = 'confirmed'
GROUP BY e.id;

DROP VIEW IF EXISTS public.post_counts;
CREATE VIEW public.post_counts WITH (security_invoker=on) AS
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

DROP VIEW IF EXISTS public.poll_option_counts;
CREATE VIEW public.poll_option_counts WITH (security_invoker=on) AS
SELECT 
  po.id as option_id,
  COUNT(pv.id) as votes_count
FROM public.poll_options po
LEFT JOIN public.poll_votes pv ON pv.option_id = po.id
GROUP BY po.id;

-- Fix profiles_complete view
DROP VIEW IF EXISTS public.profiles_complete;
CREATE VIEW public.profiles_complete WITH (security_invoker=on) AS
SELECT 
  p.id,
  p.user_id,
  p.display_id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.gender,
  p.birth_date,
  p.interests,
  p.last_activity,
  p.created_at,
  p.updated_at,
  pc.email,
  pc.phone,
  pc.address,
  pv.verification_status,
  pv.id_document_url,
  pv.license_url,
  pv.commercial_registration_url,
  pv.service_types,
  COALESCE(us.is_active, false) as suspended,
  us.reason as suspension_reason,
  us.suspended_at,
  us.suspended_until,
  us.suspended_by,
  COALESCE(ug.points_balance, 0) as points_balance,
  COALESCE(ug.total_points_earned, 0) as total_points_earned,
  ug.referral_code,
  COALESCE(ug.referral_count, 0) as referral_count,
  ug.referred_by,
  COALESCE(ug.is_shield_member, false) as is_shield_member,
  COALESCE(ug.auto_redeem_points, false) as auto_redeem_points,
  COALESCE(ups.profile_visibility, 'public') as profile_visibility,
  COALESCE(ups.interests_visibility, 'public') as interests_visibility,
  COALESCE(ups.activity_visibility, 'public') as activity_visibility,
  COALESCE(ups.allow_friend_requests, true) as allow_friend_requests,
  p.followers_count,
  p.following_count,
  p.warning_count
FROM public.profiles p
LEFT JOIN public.profile_contacts pc ON pc.user_id = p.user_id
LEFT JOIN public.provider_verifications pv ON pv.user_id = p.user_id
LEFT JOIN public.user_suspensions us ON us.user_id = p.user_id AND us.is_active = true
LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id
LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.user_id;