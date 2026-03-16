-- Create event bookmarks table
CREATE TABLE public.event_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one bookmark per user per event
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own bookmarks" 
ON public.event_bookmarks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add foreign key relationships (optional indexes for performance)
CREATE INDEX idx_event_bookmarks_user_id ON public.event_bookmarks(user_id);
CREATE INDEX idx_event_bookmarks_event_id ON public.event_bookmarks(event_id);