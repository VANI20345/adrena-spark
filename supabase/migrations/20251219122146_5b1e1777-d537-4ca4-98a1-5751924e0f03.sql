-- Allow anonymous users to view public groups
CREATE POLICY "Anonymous can view public groups"
ON public.event_groups
FOR SELECT
TO anon
USING (visibility = 'public' AND archived_at IS NULL);

-- Allow anonymous users to view group members (for avatar display)
CREATE POLICY "Anonymous can view group members of public groups"
ON public.group_members
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM event_groups eg
    WHERE eg.id = group_members.group_id
    AND eg.visibility = 'public'
    AND eg.archived_at IS NULL
  )
);

-- Allow anonymous to view cities (needed for group display)
CREATE POLICY "Anyone can view cities"
ON public.cities
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view user_interests (needed for group interests display)
CREATE POLICY "Anyone can view user interests"
ON public.user_interests
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view group_interests for public groups
CREATE POLICY "Anonymous can view group interests of public groups"
ON public.group_interests
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM event_groups eg
    WHERE eg.id = group_interests.group_id
    AND eg.visibility = 'public'
    AND eg.archived_at IS NULL
  )
);