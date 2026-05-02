-- 1. Update display_id generation function to generate 3 letters + 4 numbers (e.g., ABC1234)
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
  letters TEXT;
  numbers TEXT;
BEGIN
  LOOP
    -- Generate 3 random uppercase letters
    letters := chr(65 + floor(random() * 26)::int) || 
               chr(65 + floor(random() * 26)::int) || 
               chr(65 + floor(random() * 26)::int);
    
    -- Generate 4 random numbers
    numbers := LPAD(floor(random() * 10000)::text, 4, '0');
    
    -- Combine them
    new_id := letters || numbers;
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE display_id = new_id) INTO id_exists;
    
    -- If ID doesn't exist, return it
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$function$;

-- 2. Create friend_lists table for organizing friends into custom lists
CREATE TABLE IF NOT EXISTS public.friend_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create friend_list_members junction table
CREATE TABLE IF NOT EXISTS public.friend_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.friend_lists(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(list_id, friend_id)
);

-- 4. Create friend_group_chats table for group chats between friends
CREATE TABLE IF NOT EXISTS public.friend_group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL
);

-- 5. Create friend_group_chat_members junction table
CREATE TABLE IF NOT EXISTS public.friend_group_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.friend_group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- 6. Create friend_group_chat_messages table
CREATE TABLE IF NOT EXISTS public.friend_group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.friend_group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.friend_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_lists
CREATE POLICY "Users can view their own friend lists"
  ON public.friend_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own friend lists"
  ON public.friend_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friend lists"
  ON public.friend_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friend lists"
  ON public.friend_lists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for friend_list_members
CREATE POLICY "Users can view members of their lists"
  ON public.friend_list_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.friend_lists 
    WHERE id = friend_list_members.list_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can add members to their lists"
  ON public.friend_list_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.friend_lists 
    WHERE id = friend_list_members.list_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can remove members from their lists"
  ON public.friend_list_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.friend_lists 
    WHERE id = friend_list_members.list_id 
    AND user_id = auth.uid()
  ));

-- RLS Policies for friend_group_chats
CREATE POLICY "Members can view their group chats"
  ON public.friend_group_chats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members 
    WHERE chat_id = friend_group_chats.id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Any authenticated user can create group chats"
  ON public.friend_group_chats FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update group chats"
  ON public.friend_group_chats FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members 
    WHERE chat_id = friend_group_chats.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ));

CREATE POLICY "Admins can delete group chats"
  ON public.friend_group_chats FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members 
    WHERE chat_id = friend_group_chats.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ));

-- RLS Policies for friend_group_chat_members
CREATE POLICY "Members can view chat members"
  ON public.friend_group_chat_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members AS m
    WHERE m.chat_id = friend_group_chat_members.chat_id 
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Admins can add members"
  ON public.friend_group_chat_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members 
    WHERE chat_id = friend_group_chat_members.chat_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ));

CREATE POLICY "Members can leave groups"
  ON public.friend_group_chat_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Members can update their own read status"
  ON public.friend_group_chat_members FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for friend_group_chat_messages
CREATE POLICY "Members can view chat messages"
  ON public.friend_group_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.friend_group_chat_members 
    WHERE chat_id = friend_group_chat_messages.chat_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Members can send messages"
  ON public.friend_group_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
      SELECT 1 FROM public.friend_group_chat_members 
      WHERE chat_id = friend_group_chat_messages.chat_id 
      AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_friend_lists_user_id ON public.friend_lists(user_id);
CREATE INDEX idx_friend_list_members_list_id ON public.friend_list_members(list_id);
CREATE INDEX idx_friend_list_members_friend_id ON public.friend_list_members(friend_id);
CREATE INDEX idx_friend_group_chats_created_by ON public.friend_group_chats(created_by);
CREATE INDEX idx_friend_group_chat_members_chat_id ON public.friend_group_chat_members(chat_id);
CREATE INDEX idx_friend_group_chat_members_user_id ON public.friend_group_chat_members(user_id);
CREATE INDEX idx_friend_group_chat_messages_chat_id ON public.friend_group_chat_messages(chat_id);
CREATE INDEX idx_friend_group_chat_messages_created_at ON public.friend_group_chat_messages(created_at);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_friend_lists_updated_at
  BEFORE UPDATE ON public.friend_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friend_group_chats_updated_at
  BEFORE UPDATE ON public.friend_group_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friend_group_chat_messages_updated_at
  BEFORE UPDATE ON public.friend_group_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for group chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_chat_members;