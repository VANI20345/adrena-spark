-- ============================================================
-- E2E TEST 1: Event booking with 30% hold
-- ============================================================
DO $$
DECLARE
  v_user uuid := '46007270-081a-4597-9063-6afc29ca5c0f';  -- test@gmail.com
  v_event uuid := 'ddd5b302-44ce-4607-a9aa-517ef37dfb26'; -- 125 SAR event
  v_booking uuid;
  v_total numeric := 125;
  v_rate numeric;
  v_commission numeric;
  v_earnings numeric;
  v_vat numeric;
  v_confirm jsonb;
BEGIN
  -- Read commission rate from system_settings (same as create-booking)
  SELECT (value->>'percentage')::numeric INTO v_rate
    FROM system_settings WHERE key='commission_events';

  v_commission := ROUND(v_total * v_rate / 100, 2);
  v_earnings   := ROUND(v_total - v_commission, 2);
  v_vat        := ROUND(v_total * 0.15 / 1.15, 2);

  INSERT INTO bookings (user_id, event_id, quantity, total_amount, vat_amount,
    booking_reference, status, commission_rate, platform_commission, provider_earnings)
  VALUES (v_user, v_event, 1, v_total, v_vat,
    'E2E-EV-' || extract(epoch from now())::bigint, 'pending_payment',
    v_rate, v_commission, v_earnings)
  RETURNING id INTO v_booking;

  -- Simulate Moyasar callback by calling confirm_paid_booking directly
  v_confirm := confirm_paid_booking(
    v_booking, 'event', 'E2E-PAY-' || v_booking::text,
    (v_total * 100)::int
  );

  RAISE NOTICE 'E2E-1 booking=% confirm=%', v_booking, v_confirm;
END $$;

-- ============================================================
-- E2E TEST 2: Set wallet_hold_percent=0, run another booking
-- ============================================================
UPDATE system_settings SET value = '0'::jsonb WHERE key='wallet_hold_percent';

DO $$
DECLARE
  v_user uuid := '46007270-081a-4597-9063-6afc29ca5c0f';
  v_event uuid := '4a1b7f76-3734-4694-a4e0-91342410e690'; -- 124 SAR
  v_booking uuid;
  v_total numeric := 124;
  v_rate numeric;
  v_commission numeric;
  v_earnings numeric;
  v_vat numeric;
  v_confirm jsonb;
BEGIN
  SELECT (value->>'percentage')::numeric INTO v_rate
    FROM system_settings WHERE key='commission_events';

  v_commission := ROUND(v_total * v_rate / 100, 2);
  v_earnings   := ROUND(v_total - v_commission, 2);
  v_vat        := ROUND(v_total * 0.15 / 1.15, 2);

  INSERT INTO bookings (user_id, event_id, quantity, total_amount, vat_amount,
    booking_reference, status, commission_rate, platform_commission, provider_earnings)
  VALUES (v_user, v_event, 1, v_total, v_vat,
    'E2E-EV0-' || extract(epoch from now())::bigint, 'pending_payment',
    v_rate, v_commission, v_earnings)
  RETURNING id INTO v_booking;

  v_confirm := confirm_paid_booking(
    v_booking, 'event', 'E2E-PAY0-' || v_booking::text,
    (v_total * 100)::int
  );

  RAISE NOTICE 'E2E-2 (hold=0) booking=% confirm=%', v_booking, v_confirm;
END $$;

-- Restore default
UPDATE system_settings SET value = '30'::jsonb WHERE key='wallet_hold_percent';