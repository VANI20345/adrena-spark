
-- 1) Revoke EXECUTE on all SECURITY DEFINER functions in public from PUBLIC/anon/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- 2) Grant EXECUTE back to authenticated for functions explicitly called from the client
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_requests_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_payment_hold(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_followers(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_wallet_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_group_join(uuid,text,jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_attendee(uuid,uuid,text) TO authenticated;

-- 3) Fix RLS policies with USING/WITH CHECK true on write operations: restrict to proper roles

-- Service-role-only ALL policies: re-scope to the service_role role
DROP POLICY IF EXISTS "Service role can manage contact submissions" ON public.contact_submissions;
CREATE POLICY "Service role can manage contact submissions"
ON public.contact_submissions
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access"
ON public.profiles
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to gamification" ON public.user_gamification;
CREATE POLICY "Service role full access to gamification"
ON public.user_gamification
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to privacy settings" ON public.user_privacy_settings;
CREATE POLICY "Service role full access to privacy settings"
ON public.user_privacy_settings
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to suspensions" ON public.user_suspensions;
CREATE POLICY "Service role full access to suspensions"
ON public.user_suspensions
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to verifications" ON public.provider_verifications;
CREATE POLICY "Service role full access to verifications"
ON public.provider_verifications
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
CREATE POLICY "Service role manages payments"
ON public.payments
AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- INSERT-only system policies: re-scope to the service_role role
DROP POLICY IF EXISTS "System can award badges via service role" ON public.user_badges;
CREATE POLICY "System can award badges via service role"
ON public.user_badges
AS PERMISSIVE FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert activities" ON public.activity_logs;
CREATE POLICY "System can insert activities"
ON public.activity_logs
AS PERMISSIVE FOR INSERT
TO service_role
WITH CHECK (true);

-- Public submission endpoints: only allow anonymous visitors with a basic check
DROP POLICY IF EXISTS "Allow anonymous inserts on email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Allow anonymous inserts on email_subscriptions"
ON public.email_subscriptions
AS PERMISSIVE FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous inserts on form_submissions" ON public.form_submissions;
CREATE POLICY "Allow anonymous inserts on form_submissions"
ON public.form_submissions
AS PERMISSIVE FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Remove dangerous user_roles INSERT policies that let users self-assign roles
DROP POLICY IF EXISTS "Allow users to insert entries if they are authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "test1" ON public.user_roles;
