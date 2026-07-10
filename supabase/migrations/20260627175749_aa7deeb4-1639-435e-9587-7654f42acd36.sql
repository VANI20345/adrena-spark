
DROP POLICY IF EXISTS "Allow anonymous inserts on email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Allow anonymous inserts on email_subscriptions"
ON public.email_subscriptions
AS PERMISSIVE FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

DROP POLICY IF EXISTS "Allow anonymous inserts on form_submissions" ON public.form_submissions;
CREATE POLICY "Allow anonymous inserts on form_submissions"
ON public.form_submissions
AS PERMISSIVE FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (phone IS NULL OR length(phone) BETWEEN 5 AND 32)
  AND (enjoy_more_story IS NULL OR length(enjoy_more_story) <= 4000)
  AND (dream_experience_story IS NULL OR length(dream_experience_story) <= 4000)
);
