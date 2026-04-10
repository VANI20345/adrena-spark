-- Phase 2 & 3: 3NF Normalization - Remove duplicate columns and alias views

-- First, drop dependent views
DROP VIEW IF EXISTS profiles_public;

-- Now remove duplicate gamification columns from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS points_balance,
DROP COLUMN IF EXISTS total_points_earned,
DROP COLUMN IF EXISTS referral_code,
DROP COLUMN IF EXISTS referral_count,
DROP COLUMN IF EXISTS is_shield_member,
DROP COLUMN IF EXISTS auto_redeem_points,
DROP COLUMN IF EXISTS referred_by;

-- Recreate profiles_public view with is_shield_member from user_gamification
CREATE VIEW profiles_public AS
SELECT 
    p.id,
    p.user_id,
    p.display_id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.profile_visibility,
    p.activity_visibility,
    p.interests_visibility,
    p.allow_friend_requests,
    p.interests,
    p.followers_count,
    p.following_count,
    COALESCE(ug.is_shield_member, false) AS is_shield_member,
    p.verification_status,
    p.last_activity,
    p.created_at,
    p.updated_at
FROM profiles p
LEFT JOIN user_gamification ug ON ug.user_id = p.user_id;

-- Drop backward compatibility views (code now uses canonical table names)
DROP VIEW IF EXISTS post_comments;
DROP VIEW IF EXISTS group_members;
DROP VIEW IF EXISTS group_messages;
DROP VIEW IF EXISTS post_likes;

-- Add documentation comments
COMMENT ON TABLE profiles IS '3NF normalized: gamification data in user_gamification table';
COMMENT ON TABLE user_gamification IS 'Single source of truth for user gamification data';
COMMENT ON VIEW profiles_public IS 'Public profile info with is_shield_member from user_gamification';
COMMENT ON VIEW profiles_complete IS 'Complete profile with all joined data from related tables';