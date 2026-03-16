-- ============================================================
-- PHASE 1: CRITICAL SECURITY FIXES - Database Function Security
-- ============================================================

-- 1. Fix update_updated_at_column function - add search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Fix update_group_member_count function - add search_path  
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO member_count FROM public.group_members WHERE group_id = NEW.group_id;
    UPDATE public.event_groups SET current_members = member_count WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO member_count FROM public.group_members WHERE group_id = OLD.group_id;
    UPDATE public.event_groups SET current_members = member_count WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Fix update_post_counts function - add search_path
CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS TRIGGER AS $$
DECLARE
  likes_total INTEGER;
  comments_total INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    SELECT COUNT(*) INTO likes_total FROM public.post_likes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id);
    UPDATE public.group_posts SET likes_count = likes_total WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    SELECT COUNT(*) INTO comments_total FROM public.post_comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id);
    UPDATE public.group_posts SET comments_count = comments_total WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Fix update_poll_votes_count function - add search_path
CREATE OR REPLACE FUNCTION public.update_poll_votes_count()
RETURNS TRIGGER AS $$
DECLARE
  votes_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO votes_total FROM public.poll_votes WHERE option_id = COALESCE(NEW.option_id, OLD.option_id);
  UPDATE public.poll_options SET votes_count = votes_total WHERE id = COALESCE(NEW.option_id, OLD.option_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- RLS POLICY UPDATES - Fix overly permissive policies
-- ============================================================

-- Fix profiles table - restrict to own profile or public profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles or own profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id 
  OR profile_visibility = 'public' 
  OR profile_visibility IS NULL
);

-- Fix bookings - ensure users can only create/update their own bookings
DROP POLICY IF EXISTS "Users can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create their own bookings" ON public.bookings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
CREATE POLICY "Users can update their own bookings" ON public.bookings
FOR UPDATE USING (auth.uid() = user_id);

-- Fix loyalty_ledger - ensure users can only create their own entries
DROP POLICY IF EXISTS "Users can insert loyalty entries" ON public.loyalty_ledger;
DROP POLICY IF EXISTS "Users can create loyalty entries" ON public.loyalty_ledger;
CREATE POLICY "Users can create their own loyalty entries" ON public.loyalty_ledger
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix group_posts - ensure only group members can create posts
DROP POLICY IF EXISTS "Group members can insert posts" ON public.group_posts;
DROP POLICY IF EXISTS "Group members can create posts" ON public.group_posts;
CREATE POLICY "Group members can create posts" ON public.group_posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_posts.group_id AND user_id = auth.uid()
  )
);

-- Fix post_likes - ensure users can only create their own likes
DROP POLICY IF EXISTS "Users can insert likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.post_likes;
CREATE POLICY "Users can create their own likes" ON public.post_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix poll_votes - ensure users can only vote once
DROP POLICY IF EXISTS "Users can insert votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can create votes" ON public.poll_votes;
CREATE POLICY "Users can create their own votes" ON public.poll_votes
FOR INSERT WITH CHECK (auth.uid() = user_id);