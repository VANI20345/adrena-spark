-- Fix events INSERT RLS so admins can create events for other admins/providers without relying on user_roles visibility

-- 1) Helper: check if a user has ANY role in a list (SECURITY DEFINER avoids RLS recursion/visibility issues)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- 2) Replace policy (drop + recreate) to use security definer role checks
DROP POLICY IF EXISTS "Users and admins can create events" ON public.events;

CREATE POLICY "Users and admins can create events"
ON public.events
FOR INSERT
WITH CHECK (
  -- Users can create their own events
  auth.uid() = organizer_id
  OR
  (
    -- Admins can create events for other admins/providers
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.has_any_role(organizer_id, ARRAY['admin'::public.app_role, 'provider'::public.app_role])
  )
);
