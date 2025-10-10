-- Fix infinite recursion in friend_group_chat_members RLS policies
-- Create a security definer function to check membership
CREATE OR REPLACE FUNCTION public.is_group_chat_member(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_group_chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_chat_admin(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_group_chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

-- Drop old policies
DROP POLICY IF EXISTS "Members can view chat members" ON public.friend_group_chat_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.friend_group_chat_members;
DROP POLICY IF EXISTS "Members can leave groups" ON public.friend_group_chat_members;
DROP POLICY IF EXISTS "Members can update their own read status" ON public.friend_group_chat_members;

-- Create new policies using security definer functions
CREATE POLICY "Members can view chat members"
  ON public.friend_group_chat_members FOR SELECT
  USING (public.is_group_chat_member(chat_id, auth.uid()));

CREATE POLICY "Admins can add members"
  ON public.friend_group_chat_members FOR INSERT
  WITH CHECK (public.is_group_chat_admin(chat_id, auth.uid()));

CREATE POLICY "Members can leave groups"
  ON public.friend_group_chat_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Members can update their own read status"
  ON public.friend_group_chat_members FOR UPDATE
  USING (user_id = auth.uid());

-- Add visibility column to friend_group_chats
ALTER TABLE public.friend_group_chats ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private'));