-- 1. Fix bookings status constraint to include 'pending_payment' and 'expired'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'pending_payment', 'confirmed', 'cancelled', 'refunded', 'expired', 'paid', 'completed'));

-- 2. Drop problematic events RLS policies and recreate properly
DROP POLICY IF EXISTS "Group admins can create events for their groups" ON public.events;

-- Create a simpler policy that allows group owners/admins to create events
-- The organizer must be a member of the group (any role)
CREATE POLICY "Group admins can create events for their groups"
ON public.events
FOR INSERT
WITH CHECK (
  -- Must have a group_id
  group_id IS NOT NULL
  AND
  -- The current user must be owner or admin of the group
  EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = events.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('owner', 'admin')
  )
  AND
  -- The organizer must be a member of the group (any role including owner/admin)
  EXISTS (
    SELECT 1 FROM public.group_memberships gm2
    WHERE gm2.group_id = events.group_id
    AND gm2.user_id = events.organizer_id
  )
);

-- 3. Fix follows table - add missing unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'follows_follower_following_unique'
  ) THEN
    ALTER TABLE public.follows ADD CONSTRAINT follows_follower_following_unique 
      UNIQUE (follower_id, following_id);
  END IF;
END $$;

-- 4. Ensure reviews RLS allows users to insert reviews
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
CREATE POLICY "Users can create reviews for their bookings"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Allow users to update and delete their own reviews
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Fix bookmarks - ensure proper SELECT policy exists
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
ON public.bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.bookmarks
FOR DELETE
USING (auth.uid() = user_id);