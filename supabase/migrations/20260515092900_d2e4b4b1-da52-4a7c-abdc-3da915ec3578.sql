-- 1. Extend review state enum
ALTER TYPE public.hold_review_state ADD VALUE IF NOT EXISTS 'no_hold_required';

-- Commit enum addition before using it
COMMIT;
BEGIN;

-- 2. Update create_payment_hold_with_split: handle 0% hold gracefully
CREATE OR REPLACE FUNCTION public.create_payment_hold_with_split(p_booking_id uuid, p_booking_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id uuid; v_user_id uuid; v_total numeric;
  v_provider_earnings numeric; v_platform_commission numeric; v_vat numeric;
  v_hold_pct numeric; v_immediate_pct numeric; v_hold_hours integer;
  v_available numeric; v_held numeric;
  v_event_end timestamptz; v_hold_until timestamptz;
  v_hold_id uuid; v_existing_hold uuid;
  v_source_type text; v_booking_table text;
  v_raw_setting jsonb;
  v_status payment_hold_status;
  v_review hold_review_state;
  v_released_at timestamptz;
BEGIN
  SELECT id INTO v_existing_hold FROM public.payment_holds WHERE source_id = p_booking_id LIMIT 1;
  IF v_existing_hold IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'hold_id', v_existing_hold, 'skipped', true);
  END IF;

  SELECT value INTO v_raw_setting FROM public.system_settings WHERE key = 'wallet_hold_percent';
  IF v_raw_setting IS NOT NULL THEN
    IF jsonb_typeof(v_raw_setting) = 'object' AND v_raw_setting ? 'percentage' THEN
      v_hold_pct := COALESCE((v_raw_setting->>'percentage')::numeric, 30);
    ELSE
      v_hold_pct := COALESCE(NULLIF(trim(both '"' from v_raw_setting::text), '')::numeric, 30);
    END IF;
  ELSE
    v_hold_pct := 30;
  END IF;
  v_immediate_pct := 100 - v_hold_pct;

  v_hold_hours := COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '')::integer FROM public.system_settings WHERE key = 'payment_hold_hours'),
    72
  );

  IF p_booking_type = 'service' THEN
    v_booking_table := 'service_bookings'; v_source_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.provider_earnings, sb.platform_commission,
           COALESCE(sb.vat_on_commission, 0),
           CASE WHEN sb.service_date IS NOT NULL AND sb.end_time IS NOT NULL
                THEN (substring(sb.service_date::text from 1 for 10) || ' ' || sb.end_time)::timestamptz
                ELSE now() END
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings, v_platform_commission, v_vat, v_event_end
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_booking_table := 'bookings'; v_source_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.provider_earnings, b.platform_commission,
           COALESCE(b.vat_on_commission, b.vat_amount), e.end_date
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings, v_platform_commission, v_vat, v_event_end
    FROM public.bookings b JOIN public.events e ON e.id = b.event_id WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_or_provider_not_found');
  END IF;

  v_provider_earnings := COALESCE(v_provider_earnings, 0);
  v_platform_commission := COALESCE(v_platform_commission, 0);
  v_vat := COALESCE(v_vat, 0);

  v_held := ROUND((v_provider_earnings * v_hold_pct / 100.0)::numeric, 2);
  v_available := ROUND((v_provider_earnings - v_held)::numeric, 2);

  v_hold_until := GREATEST(now(), COALESCE(v_event_end, now())) + (v_hold_hours || ' hours')::interval;

  IF v_held = 0 THEN
    v_status := 'released'::payment_hold_status;
    v_review := 'no_hold_required'::hold_review_state;
    v_released_at := now();
  ELSE
    v_status := 'held'::payment_hold_status;
    v_review := 'pending'::hold_review_state;
    v_released_at := NULL;
  END IF;

  INSERT INTO public.payment_holds (
    source_type, source_id, provider_id, payer_id, gross_amount, platform_fee, vat_amount, net_amount,
    available_amount, held_amount, currency, status, event_end_at, hold_until,
    complaint_extension, booking_table, auto_split_percent, review_state, released_at
  ) VALUES (
    v_source_type::payment_hold_source, p_booking_id, v_provider_id, v_user_id,
    v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_available, v_held, 'SAR', v_status, v_event_end, v_hold_until,
    false, v_booking_table, v_immediate_pct::int, v_review, v_released_at
  ) RETURNING id INTO v_hold_id;

  -- Wallet update: when held=0 entire earnings -> balance only (no held_balance).
  IF v_held = 0 THEN
    INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
    VALUES (v_provider_id, v_available, v_available, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_wallets.balance + EXCLUDED.balance,
          total_earned = public.user_wallets.total_earned + EXCLUDED.balance,
          updated_at = now();
  ELSE
    INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
    VALUES (v_provider_id, v_available, v_available, v_held)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_wallets.balance + EXCLUDED.balance,
          total_earned = public.user_wallets.total_earned + EXCLUDED.balance,
          held_balance = public.user_wallets.held_balance + EXCLUDED.held_balance,
          updated_at = now();
  END IF;

  IF v_available > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, description, status, reference_id, reference_type)
    VALUES (v_provider_id, 'credit', v_available,
      'إيرادات فورية (' || v_immediate_pct::text || '%) من حجز #' || substring(p_booking_id::text, 1, 8),
      'completed', p_booking_id, v_source_type);
  END IF;

  IF v_held > 0 THEN
    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, commission_amount, vat_amount, net_amount,
      payer_id, receiver_id, reference_type, reference_id, service_type, status, metadata
    ) VALUES (
      'hold_created', v_held, v_platform_commission, v_vat, v_provider_earnings,
      v_user_id, v_provider_id, v_source_type, p_booking_id, 'hold', 'held',
      jsonb_build_object('hold_pct', v_hold_pct, 'immediate_pct', v_immediate_pct, 'hold_id', v_hold_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'hold_id', v_hold_id,
    'available_amount', v_available, 'held_amount', v_held,
    'hold_pct', v_hold_pct, 'immediate_pct', v_immediate_pct,
    'status', v_status::text, 'review_state', v_review::text
  );
END;
$function$;

-- 3. Cleanup stale pending payments (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_payments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.payments
       SET status = 'expired', updated_at = now()
     WHERE status = 'pending'
       AND created_at < now() - interval '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.payments p2
          WHERE p2.booking_id = payments.booking_id
            AND p2.status = 'completed'
       )
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  IF v_count > 0 THEN
    INSERT INTO public.system_logs (level, source, message, metadata)
    VALUES ('info', 'cleanup_stale_pending_payments',
            'Marked ' || v_count || ' stale pending payments as expired',
            jsonb_build_object('count', v_count, 'cutoff', now() - interval '24 hours'));
  END IF;

  RETURN jsonb_build_object('ok', true, 'expired', v_count);
END;
$$;

-- 4. Backfill missing invoices for existing payment_holds
CREATE OR REPLACE FUNCTION public.backfill_missing_invoices()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_generated int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_btype text;
  v_res jsonb;
BEGIN
  FOR r IN
    SELECT h.source_id, h.source_type
      FROM public.payment_holds h
     WHERE NOT EXISTS (
       SELECT 1 FROM public.platform_invoices pi WHERE pi.reference_id = h.source_id
     )
  LOOP
    v_btype := CASE WHEN r.source_type::text = 'service_booking' THEN 'service' ELSE 'event' END;
    BEGIN
      v_res := public.generate_booking_invoices(r.source_id, v_btype);
      IF (v_res->>'ok')::boolean THEN
        v_generated := v_generated + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('generated', v_generated, 'skipped', v_skipped, 'failed', v_failed);
END;
$$;

COMMIT;