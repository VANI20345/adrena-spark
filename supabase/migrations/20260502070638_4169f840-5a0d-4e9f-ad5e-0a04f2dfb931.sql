
DROP POLICY IF EXISTS "Super admins can view all payment holds" ON public.payment_holds;
DROP POLICY IF EXISTS "Providers can view their own payment holds" ON public.payment_holds;
DROP POLICY IF EXISTS "Providers can view their own holds" ON public.payment_holds;

CREATE POLICY "Admins and super admins can view all payment holds"
  ON public.payment_holds
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Providers can view their own payment holds"
  ON public.payment_holds
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());
