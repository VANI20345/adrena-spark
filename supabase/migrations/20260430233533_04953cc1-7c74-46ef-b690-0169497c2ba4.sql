
-- =================================================================
-- 1.1: تنظيف الحجوزات بمبلغ صفر وكل تبعياتها
-- =================================================================

-- service_bookings = 0
DELETE FROM public.payment_holds 
WHERE source_id IN (SELECT id FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.wallet_transactions 
WHERE reference_id IN (SELECT id FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.notifications 
WHERE data ? 'booking_id' 
  AND (data->>'booking_id') ~ '^[0-9a-f-]{36}$'
  AND (data->>'booking_id')::uuid IN (SELECT id FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.financial_transaction_logs 
WHERE reference_id IN (SELECT id FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.payments 
WHERE booking_id IN (SELECT id FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.service_bookings WHERE total_amount = 0 OR total_amount IS NULL;

-- bookings = 0
DELETE FROM public.payment_holds 
WHERE source_id IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.tickets 
WHERE booking_id IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.wallet_transactions 
WHERE reference_id IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.notifications 
WHERE data ? 'booking_id' 
  AND (data->>'booking_id') ~ '^[0-9a-f-]{36}$'
  AND (data->>'booking_id')::uuid IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.financial_transaction_logs 
WHERE reference_id IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.payments 
WHERE booking_id IN (SELECT id FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL);

DELETE FROM public.bookings WHERE total_amount = 0 OR total_amount IS NULL;

-- =================================================================
-- 1.2: إعادة بناء أرصدة المحافظ من المصادر الموثوقة
-- =================================================================

UPDATE public.user_wallets w
SET 
  balance = COALESCE((
    SELECT SUM(CASE 
      WHEN wt.type IN ('earning', 'release', 'refund') THEN wt.amount
      WHEN wt.type IN ('payment', 'withdraw') THEN -ABS(wt.amount)
      ELSE 0
    END)
    FROM public.wallet_transactions wt
    WHERE wt.user_id = w.user_id AND wt.status = 'completed'
  ), 0),
  total_earned = COALESCE((
    SELECT SUM(wt.amount)
    FROM public.wallet_transactions wt
    WHERE wt.user_id = w.user_id AND wt.type = 'earning' AND wt.status = 'completed'
  ), 0),
  held_balance = COALESCE((
    SELECT SUM(ph.held_amount)
    FROM public.payment_holds ph
    WHERE ph.provider_id = w.user_id 
      AND ph.status::text IN ('held', 'ready_for_release', 'dispute_hold', 'under_review')
  ), 0),
  updated_at = now();

UPDATE public.user_wallets SET balance = 0 WHERE balance < 0;
UPDATE public.user_wallets SET held_balance = 0 WHERE held_balance < 0;

-- =================================================================
-- 1.3: قيود الحماية (CHECK + UNIQUE)
-- =================================================================

ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_total_amount_positive;
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_total_amount_positive CHECK (total_amount > 0);

ALTER TABLE public.service_bookings 
  DROP CONSTRAINT IF EXISTS service_bookings_total_amount_positive;
ALTER TABLE public.service_bookings 
  ADD CONSTRAINT service_bookings_total_amount_positive CHECK (total_amount > 0);

ALTER TABLE public.user_wallets 
  DROP CONSTRAINT IF EXISTS user_wallets_balance_non_negative;
ALTER TABLE public.user_wallets 
  ADD CONSTRAINT user_wallets_balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.user_wallets 
  DROP CONSTRAINT IF EXISTS user_wallets_held_non_negative;
ALTER TABLE public.user_wallets 
  ADD CONSTRAINT user_wallets_held_non_negative CHECK (held_balance >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS payment_holds_source_id_unique 
  ON public.payment_holds(source_id);
