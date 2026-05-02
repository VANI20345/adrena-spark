-- Add visibility and approval settings to event_groups
ALTER TABLE public.event_groups
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false;

-- Create group join requests table
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group_join_requests
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_join_requests
CREATE POLICY "Users can create join requests"
ON public.group_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
ON public.group_join_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Group admins can view requests"
ON public.group_join_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_join_requests.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Group admins can update requests"
ON public.group_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_join_requests.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'owner')
  )
);

-- Update group_members INSERT policy to allow public groups
DROP POLICY IF EXISTS "Users can only join event groups they're authorized for" ON public.group_members;

CREATE POLICY "Users can join authorized groups"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    -- Public groups without approval requirement
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      WHERE eg.id = group_members.group_id
      AND eg.visibility = 'public'
      AND eg.requires_approval = false
    )
    -- Regional groups
    OR EXISTS (
      SELECT 1 FROM public.event_groups eg
      WHERE eg.id = group_members.group_id
      AND eg.group_type = 'region'
    )
    -- Event organizers
    OR EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.events e ON eg.event_id = e.id
      WHERE eg.id = group_members.group_id
      AND e.organizer_id = auth.uid()
    )
    -- Event attendees (confirmed bookings)
    OR EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.bookings b ON eg.event_id = b.event_id
      WHERE eg.id = group_members.group_id
      AND b.user_id = auth.uid()
      AND b.status = 'confirmed'
    )
    -- Admins
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    )
  )
);