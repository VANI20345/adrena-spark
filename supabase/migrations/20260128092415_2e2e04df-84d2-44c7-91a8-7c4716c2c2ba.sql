-- Update events INSERT policy to allow admin cross-creation
DROP POLICY IF EXISTS "Organizers can create their own events" ON public.events;

CREATE POLICY "Users and admins can create events"
ON public.events FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id
  OR
  (
    public.has_role(auth.uid(), 'admin')
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = organizer_id AND role IN ('admin'::app_role, 'provider'::app_role)
    )
  )
);