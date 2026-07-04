
-- Fix: service_bookings does not have vat_amount; use vat_on_commission
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

  INSERT INTO public.payment_holds (
    source_type, source_id, provider_id, payer_id, gross_amount, platform_fee, vat_amount, net_amount,
    available_amount, held_amount, currency, status, event_end_at, hold_until,
    complaint_extension, booking_table, auto_split_percent
  ) VALUES (
    v_source_type::payment_hold_source, p_booking_id, v_provider_id, v_user_id,
    v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_available, v_held, 'SAR', 'held'::payment_hold_status, v_event_end, v_hold_until,
    false, v_booking_table, v_immediate_pct::int
  ) RETURNING id INTO v_hold_id;

  INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
  VALUES (v_provider_id, v_available, v_available, v_held)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + EXCLUDED.balance,
        total_earned = public.user_wallets.total_earned + EXCLUDED.balance,
        held_balance = public.user_wallets.held_balance + EXCLUDED.held_balance,
        updated_at = now();

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
    'hold_pct', v_hold_pct, 'immediate_pct', v_immediate_pct
  );
END;
$function$;

-- ====================== TEST HARNESS ======================
CREATE TABLE IF NOT EXISTS public.p3_test_results (
  id serial PRIMARY KEY,
  scenario text,
  expected jsonb,
  actual jsonb,
  pass boolean,
  created_at timestamptz DEFAULT now()
);
TRUNCATE public.p3_test_results;

SET LOCAL session_replication_role = 'replica';

DO $$
DECLARE
  v_user_id uuid := '6304d647-5ad2-4b9d-8ce9-e8637245012a';
  v_provider_id uuid := '31ff1ac6-9e58-436f-a32c-e7f416bb4217';
  v_event_id uuid;
  v_service_id_evt uuid;
  v_service_id_trn uuid;
  v_b1 uuid; v_b2 uuid; v_b3 uuid;
  v_hold jsonb;
  v_actual jsonb;
  v_validation_results jsonb := '[]'::jsonb;
BEGIN
  -- Reset wallet for clean baseline
  DELETE FROM public.user_wallets WHERE user_id = v_provider_id;

  INSERT INTO public.events (organizer_id, title, title_ar, location, location_ar, start_date, end_date, price, status)
  VALUES (v_provider_id, 'P3 Test Event', 'فعالية اختبار', 'Riyadh', 'الرياض',
          now() + interval '1 day', now() + interval '1 day 2 hours', 500, 'approved')
  RETURNING id INTO v_event_id;

  INSERT INTO public.services (provider_id, name, name_ar, price, service_type, status)
  VALUES (v_provider_id, 'P3 Test Service', 'خدمة اختبار', 400, 'other', 'approved')
  RETURNING id INTO v_service_id_evt;

  INSERT INTO public.services (provider_id, name, name_ar, price, service_type, status)
  VALUES (v_provider_id, 'P3 Test Training', 'تدريب اختبار', 1000, 'training', 'approved')
  RETURNING id INTO v_service_id_trn;

  -- CASE 1
  UPDATE public.system_settings SET value='{"percentage":10}'::jsonb WHERE key='commission_events';
  UPDATE public.system_settings SET value='30'::jsonb WHERE key='wallet_hold_percent';

  INSERT INTO public.bookings (user_id, event_id, quantity, total_amount, vat_amount,
      booking_reference, status, commission_rate, platform_commission, provider_earnings)
  VALUES (v_user_id, v_event_id, 1, 500, ROUND(500*0.15/1.15,2),
          'P3TEST-EVT-1', 'confirmed', 10, 50, 450)
  RETURNING id INTO v_b1;

  v_hold := public.create_payment_hold_with_split(v_b1, 'event');

  SELECT jsonb_build_object(
    'booking', (SELECT jsonb_build_object('total_amount',total_amount,'commission_rate',commission_rate,
                  'platform_commission',platform_commission,'provider_earnings',provider_earnings)
                FROM public.bookings WHERE id=v_b1),
    'hold', (SELECT jsonb_build_object('available_amount',available_amount,'held_amount',held_amount,
                  'auto_split_percent',auto_split_percent,'status',status,'review_state',review_state)
              FROM public.payment_holds WHERE source_id=v_b1),
    'wallet', (SELECT jsonb_build_object('balance',balance,'held_balance',held_balance)
                FROM public.user_wallets WHERE user_id=v_provider_id),
    'rpc_result', v_hold
  ) INTO v_actual;

  INSERT INTO public.p3_test_results (scenario, expected, actual, pass)
  VALUES ('CASE 1: Event 500 / commission 10% / hold 30%',
          '{"commission":50,"earnings":450,"available":315,"held":135}'::jsonb, v_actual,
          (v_actual->'booking'->>'platform_commission')::numeric=50
          AND (v_actual->'booking'->>'provider_earnings')::numeric=450
          AND (v_actual->'hold'->>'available_amount')::numeric=315
          AND (v_actual->'hold'->>'held_amount')::numeric=135);

  -- CASE 2
  UPDATE public.system_settings SET value='{"percentage":20}'::jsonb WHERE key='commission_services';
  UPDATE public.system_settings SET value='25'::jsonb WHERE key='wallet_hold_percent';

  INSERT INTO public.service_bookings (user_id, service_id, provider_id, booking_date, service_date,
      total_amount, booking_reference, status, commission_rate, platform_commission, provider_earnings, vat_on_commission)
  VALUES (v_user_id, v_service_id_evt, v_provider_id, now(), (now()+interval '1 day')::date,
          400, 'P3TEST-SVC-2', 'confirmed', 20, 80, 320, ROUND(80*0.15/1.15,2))
  RETURNING id INTO v_b2;

  v_hold := public.create_payment_hold_with_split(v_b2, 'service');

  SELECT jsonb_build_object(
    'booking', (SELECT jsonb_build_object('total_amount',total_amount,'commission_rate',commission_rate,
                  'platform_commission',platform_commission,'provider_earnings',provider_earnings)
                FROM public.service_bookings WHERE id=v_b2),
    'hold', (SELECT jsonb_build_object('available_amount',available_amount,'held_amount',held_amount,
                  'auto_split_percent',auto_split_percent,'status',status,'review_state',review_state)
              FROM public.payment_holds WHERE source_id=v_b2),
    'wallet', (SELECT jsonb_build_object('balance',balance,'held_balance',held_balance)
                FROM public.user_wallets WHERE user_id=v_provider_id),
    'rpc_result', v_hold
  ) INTO v_actual;

  INSERT INTO public.p3_test_results (scenario, expected, actual, pass)
  VALUES ('CASE 2: Service 400 / commission 20% / hold 25%',
          '{"commission":80,"earnings":320,"available":240,"held":80}'::jsonb, v_actual,
          (v_actual->'booking'->>'platform_commission')::numeric=80
          AND (v_actual->'booking'->>'provider_earnings')::numeric=320
          AND (v_actual->'hold'->>'available_amount')::numeric=240
          AND (v_actual->'hold'->>'held_amount')::numeric=80);

  -- CASE 3
  UPDATE public.system_settings SET value='{"percentage":15}'::jsonb WHERE key='commission_training';
  UPDATE public.system_settings SET value='0'::jsonb WHERE key='wallet_hold_percent';

  INSERT INTO public.service_bookings (user_id, service_id, provider_id, booking_date, service_date,
      total_amount, booking_reference, status, commission_rate, platform_commission, provider_earnings, vat_on_commission)
  VALUES (v_user_id, v_service_id_trn, v_provider_id, now(), (now()+interval '1 day')::date,
          1000, 'P3TEST-TRN-3', 'confirmed', 15, 150, 850, ROUND(150*0.15/1.15,2))
  RETURNING id INTO v_b3;

  v_hold := public.create_payment_hold_with_split(v_b3, 'service');

  SELECT jsonb_build_object(
    'booking', (SELECT jsonb_build_object('total_amount',total_amount,'commission_rate',commission_rate,
                  'platform_commission',platform_commission,'provider_earnings',provider_earnings)
                FROM public.service_bookings WHERE id=v_b3),
    'hold', (SELECT jsonb_build_object('available_amount',available_amount,'held_amount',held_amount,
                  'auto_split_percent',auto_split_percent,'status',status,'review_state',review_state)
              FROM public.payment_holds WHERE source_id=v_b3),
    'wallet', (SELECT jsonb_build_object('balance',balance,'held_balance',held_balance)
                FROM public.user_wallets WHERE user_id=v_provider_id),
    'rpc_result', v_hold
  ) INTO v_actual;

  INSERT INTO public.p3_test_results (scenario, expected, actual, pass)
  VALUES ('CASE 3: Training 1000 / commission 15% / hold 0%',
          '{"commission":150,"earnings":850,"available":850,"held":0}'::jsonb, v_actual,
          (v_actual->'booking'->>'platform_commission')::numeric=150
          AND (v_actual->'booking'->>'provider_earnings')::numeric=850
          AND (v_actual->'hold'->>'available_amount')::numeric=850
          AND (v_actual->'hold'->>'held_amount')::numeric=0);

  -- VALIDATION TESTS
  SET LOCAL session_replication_role = 'origin';

  BEGIN
    UPDATE public.system_settings SET value='-1'::jsonb WHERE key='wallet_hold_percent';
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','hold=-1','rejected',false));
  EXCEPTION WHEN OTHERS THEN
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','hold=-1','rejected',true,'error',SQLERRM));
  END;
  BEGIN
    UPDATE public.system_settings SET value='101'::jsonb WHERE key='wallet_hold_percent';
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','hold=101','rejected',false));
  EXCEPTION WHEN OTHERS THEN
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','hold=101','rejected',true,'error',SQLERRM));
  END;
  BEGIN
    UPDATE public.system_settings SET value='{"percentage":101}'::jsonb WHERE key='commission_events';
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','commission_events=101','rejected',false));
  EXCEPTION WHEN OTHERS THEN
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','commission_events=101','rejected',true,'error',SQLERRM));
  END;
  BEGIN
    INSERT INTO public.system_settings (key, value, description) VALUES ('wallet_split_immediate_percent','70'::jsonb,'legacy');
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','legacy-key-insert','rejected',false));
  EXCEPTION WHEN OTHERS THEN
    v_validation_results := v_validation_results || jsonb_build_array(jsonb_build_object('test','legacy-key-insert','rejected',true,'error',SQLERRM));
  END;

  INSERT INTO public.p3_test_results (scenario, expected, actual, pass)
  VALUES ('VALIDATION TESTS', '"all rejected"'::jsonb, v_validation_results,
          (SELECT bool_and((x->>'rejected')::boolean) FROM jsonb_array_elements(v_validation_results) x));

  SET LOCAL session_replication_role = 'replica';
  UPDATE public.system_settings SET value='{"percentage":10}'::jsonb WHERE key='commission_events';
  UPDATE public.system_settings SET value='{"percentage":10}'::jsonb WHERE key='commission_services';
  UPDATE public.system_settings SET value='{"percentage":10}'::jsonb WHERE key='commission_training';
  UPDATE public.system_settings SET value='30'::jsonb WHERE key='wallet_hold_percent';
END $$;
