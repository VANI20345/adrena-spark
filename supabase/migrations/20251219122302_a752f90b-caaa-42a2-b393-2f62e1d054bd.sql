-- Allow anonymous to view basic profile info for group member avatars (only for public groups)
CREATE POLICY "Anonymous can view profiles for public group members"
ON public.profiles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN event_groups eg ON eg.id = gm.group_id
    WHERE gm.user_id = profiles.user_id
    AND eg.visibility = 'public'
    AND eg.archived_at IS NULL
  )
);