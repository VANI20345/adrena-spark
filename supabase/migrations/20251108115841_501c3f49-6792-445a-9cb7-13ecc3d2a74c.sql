-- Create poll_options table for storing poll choices
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 0,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table for tracking user votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Add post_type column to group_posts to differentiate post types
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text';

-- Enable RLS on poll tables
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_options
CREATE POLICY "Group members can view poll options"
ON public.poll_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN group_posts gp ON gp.group_id = gm.group_id
    WHERE gp.id = poll_options.post_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Post creators can create poll options"
ON public.poll_options FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_posts
    WHERE id = poll_options.post_id AND user_id = auth.uid()
  )
);

-- RLS policies for poll_votes
CREATE POLICY "Group members can view poll votes"
ON public.poll_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN group_posts gp ON gp.group_id = gm.group_id
    WHERE gp.id = poll_votes.post_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can vote on polls"
ON public.poll_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN group_posts gp ON gp.group_id = gm.group_id
    WHERE gp.id = poll_votes.post_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own votes"
ON public.poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- Function to update poll option vote count
CREATE OR REPLACE FUNCTION public.update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET votes_count = GREATEST(0, votes_count - 1) WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for poll votes count
DROP TRIGGER IF EXISTS trigger_update_poll_votes_count ON public.poll_votes;
CREATE TRIGGER trigger_update_poll_votes_count
AFTER INSERT OR DELETE ON public.poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_poll_votes_count();

-- Add parent_id for threaded comments
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_poll_options_post_id ON public.poll_options(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_id);