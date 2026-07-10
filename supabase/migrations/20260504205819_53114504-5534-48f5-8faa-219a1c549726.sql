-- =========================================================
-- 1) confirm_paid_booking: deduct loyalty points inside the same transaction
--    (idempotent — checks if a 'redeemed' ledger row already exists for this booking)
-- =========================================================
CREATE OR REPLACE FUNCTION public.confirm_paid_booking(
  p_booking_id uuid,
  p_booking_type text,
  p_payment_id text,
  p_provider_amount_halalas integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_table text;
  v_user_id uuid;
  v_total numeric;
  v_status text;
  v_event_id uuid;
  v_quantity int;
  v_provider_id uuid;
  v_expected_halalas int;
  v_hold_res jsonb;
  v_inv_res jsonb;
  v_admin RECORD;
  v_points int;
  v_points_used int := 0;
  v_ref_type text;
BEGIN
  IF p_booking_id IS NULL OR p_booking_type IS NULL OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_params');
  END IF;

  v_booking_table := CASE WHEN p_booking_type = 'service' THEN 'service_bookings' ELSE 'bookings' END;
  v_ref_type := CASE WHEN p_booking_type = 'service' THEN 'service_booking' ELSE 'event_booking' END;

  IF p_booking_type = 'service' THEN
    SELECT user_id, total_amount, status, provider_id, COALESCE(quantity,1)
      INTO v_user_id, v_total, v_status, v_provider_id, v_quantity
    FROM public.service_bookings WHERE id = p_booking_id FOR UPDATE;
  ELSE
    SELECT b.user_id, b.total_amount, b.status, e.organizer_id, COALESCE(b.quantity,1), b.event_id, COALESCE(b.points_used,0)
      INTO v_user_id, v_total, v_status, v_provider_id, v_quantity, v_event_id, v_points_used
    FROM public.bookings b
    LEFT JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id FOR UPDATE;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF v_status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'already_confirmed', true);
  END IF;

  -- Strict amount match against Moyasar (in halalas) — abort + alert on mismatch
  IF p_provider_amount_halalas IS NOT NULL THEN
    v_expected_halalas := ROUND(v_total * 100)::int;
    IF abs(v_expected_halalas - p_provider_amount_halalas) > 1 THEN
      INSERT INTO public.financial_transaction_logs
        (transaction_type, amount, status, reference_type, reference_id, payer_id, metadata)
      VALUES
        ('booking_payment', v_total, 'failed', v_ref_type, p_booking_id, v_user_id,
         jsonb_build_object('error','amount_mismatch','expected_halalas',v_expected_halalas,
                            'received_halalas',p_provider_amount_halalas,'payment_id',p_payment_id));
      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id, 'system_alert', 'Payment amount mismatch',
             'Booking '||substring(p_booking_id::text,1,8)||' total mismatch with Moyasar',
             jsonb_build_object('booking_id',p_booking_id,'payment_id',p_payment_id,
                                'expected_halalas',v_expected_halalas,
                                'received_halalas',p_provider_amount_halalas)
      FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');
      RETURN jsonb_build_object('ok', false, 'error', 'amount_mismatch',
        'expected', v_expected_halalas, 'received', p_provider_amount_halalas);
    END IF;
  END IF;

  UPDATE public.payments
     SET status = 'completed', completed_at = now()
   WHERE provider_payment_id = p_payment_id;

  IF p_booking_type = 'service' THEN
    UPDATE public.service_bookings
       SET status = 'confirmed', payment_id = p_payment_id, updated_at = now()
     WHERE id = p_booking_id AND status <> 'confirmed';
  ELSE
    UPDATE public.bookings
       SET status = 'confirmed', payment_id = p_payment_id, updated_at = now()
     WHERE id = p_booking_id AND status <> 'confirmed';
  END IF;

  v_hold_res := public.create_payment_hold_with_split(p_booking_id, p_booking_type);
  IF (v_hold_res->>'ok')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'create_payment_hold_with_split failed: %', v_hold_res::text;
  END IF;

  BEGIN
    v_inv_res := public.generate_booking_invoices(p_booking_id, p_booking_type);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_logs(level, message, details, user_id)
    VALUES ('error', 'generate_booking_invoices failed inside confirm_paid_booking',
            jsonb_build_object('booking_id', p_booking_id, 'err', SQLERRM), v_user_id);
  END;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, status, reference_id, reference_type
  ) VALUES (
    v_user_id, 'payment', -v_total,
    CASE WHEN p_booking_type = 'event'
         THEN 'دفع حجز فعالية #' || substring(p_booking_id::text,1,8)
         ELSE 'دفع حجز خدمة #' || substring(p_booking_id::text,1,8) END,
    'completed', p_booking_id, v_ref_type
  );

  -- Points redemption (atomic + idempotent — only for events that recorded points_used)
  IF p_booking_type = 'event' AND v_points_used > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.loyalty_ledger
      WHERE reference_id = p_booking_id
        AND reference_type = 'event_booking'
        AND type = 'redeemed'
    ) THEN
      INSERT INTO public.loyalty_ledger (user_id, points, type, description, reference_id, reference_type)
      VALUES (v_user_id, -v_points_used, 'redeemed',
              'استخدام النقاط للحجز '||substring(p_booking_id::text,1,8),
              p_booking_id, 'event_booking');
    END IF;
  END IF;

  -- Tickets
  IF p_booking_type = 'event' AND v_event_id IS NOT NULL AND v_quantity > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE booking_id = p_booking_id LIMIT 1) THEN
      INSERT INTO public.tickets (booking_id, ticket_number, qr_code, holder_name, status)
      SELECT p_booking_id,
             substring(p_booking_id::text,1,8) || '-' || gs::text,
             p_booking_id::text || '-' || gs::text || '-' || extract(epoch from now())::bigint::text,
             'Guest', 'active'
      FROM generate_series(1, v_quantity) gs;
    END IF;
  END IF;

  -- Loyalty earn (1%)
  v_points := floor(v_total * 0.01);
  IF v_points > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.loyalty_ledger
      WHERE reference_id = p_booking_id AND reference_type = v_ref_type AND type='earned'
    ) THEN
      INSERT INTO public.loyalty_ledger (user_id, points, type, description, reference_id, reference_type)
      VALUES (v_user_id, v_points, 'earned',
              'نقاط من الحجز ' || substring(p_booking_id::text,1,8),
              p_booking_id, v_ref_type);
    END IF;
  END IF;

  -- Single canonical financial log
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, status, reference_type, reference_id, payer_id, receiver_id, service_type, metadata)
  VALUES
    ('booking_payment', v_total, 'completed', v_ref_type, p_booking_id, v_user_id, v_provider_id, p_booking_type,
     jsonb_build_object('payment_id', p_payment_id, 'points_used', v_points_used));

  -- Notifications
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (v_user_id, 'payment_success', 'تم الدفع بنجاح',
          'تم استلام دفعتك بقيمة ' || v_total || ' ريال',
          jsonb_build_object('booking_id', p_booking_id, 'payment_id', p_payment_id,
                             'amount', v_total, 'booking_type', p_booking_type));

  IF v_provider_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_provider_id, 'new_booking_received', 'تم شراء تذكرة جديدة',
            'تم استلام حجز جديد بقيمة ' || v_total || ' ريال. سيتم إيداع 70% فوراً والباقي بعد فترة الحجز.',
            jsonb_build_object('booking_id', p_booking_id, 'amount', v_total, 'booking_type', p_booking_type));
  END IF;

  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_admin.user_id, 'admin_new_payment', 'عملية دفع جديدة',
            'تم استلام دفعة بقيمة ' || v_total || ' ريال.',
            jsonb_build_object('booking_id', p_booking_id, 'amount', v_total,
                               'booking_type', p_booking_type, 'provider_id', v_provider_id));
  END LOOP;

  RETURN jsonb_build_object('ok', true,
    'booking_id', p_booking_id, 'hold', v_hold_res, 'invoices', v_inv_res);
END;
$function$;

-- =========================================================
-- 2) Extend cleanup function to also expire stale service bookings
-- =========================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_booking_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_count integer := 0;
  rec RECORD;
BEGIN
  -- Event bookings
  FOR rec IN
    SELECT id, event_id, quantity, user_id, booking_reference
    FROM public.bookings
    WHERE status = 'pending_payment'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < NOW()
  LOOP
    UPDATE public.events
       SET current_attendees = GREATEST(0, COALESCE(current_attendees,0) - rec.quantity)
     WHERE id = rec.event_id;

    UPDATE public.bookings SET status='expired', updated_at=now() WHERE id = rec.id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (rec.user_id, 'booking_expired', 'انتهت صلاحية الحجز',
            'انتهت مهلة الدفع لحجزك ' || COALESCE(rec.booking_reference,'') || '. تم تحرير المقاعد.',
            jsonb_build_object('booking_id', rec.id, 'booking_reference', rec.booking_reference, 'event_id', rec.event_id));
    expired_count := expired_count + 1;
  END LOOP;

  -- Service bookings (no attendee counter to decrement; capacity is computed live)
  FOR rec IN
    SELECT id, user_id, booking_reference
    FROM public.service_bookings
    WHERE status = 'pending_payment'
      AND created_at < (NOW() - interval '30 minutes')
  LOOP
    UPDATE public.service_bookings SET status='expired', updated_at=now() WHERE id = rec.id;
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (rec.user_id, 'booking_expired', 'انتهت صلاحية الحجز',
            'انتهت مهلة الدفع لحجز الخدمة ' || COALESCE(rec.booking_reference,'') || '.',
            jsonb_build_object('service_booking_id', rec.id, 'booking_reference', rec.booking_reference));
    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$function$;

-- =========================================================
-- 3) Helper: atomic reconciliation of a single Moyasar payment
--    The edge function calls Moyasar (HTTP), then calls this RPC with the result.
-- =========================================================
CREATE OR REPLACE FUNCTION public.reconcile_pending_payment(
  p_payment_row_id uuid,
  p_moyasar_status text,
  p_moyasar_amount_halalas integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pay RECORD;
  v_b_status text;
  v_sb_status text;
  v_b_total numeric;
  v_event_id uuid;
  v_quantity int;
  v_user_id uuid;
  v_ref text;
  v_is_service boolean;
  v_res jsonb;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_row_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'payment_not_found'); END IF;

  -- Detect whether this booking_id belongs to bookings or service_bookings
  SELECT status, total_amount, event_id, quantity, user_id, booking_reference
    INTO v_b_status, v_b_total, v_event_id, v_quantity, v_user_id, v_ref
  FROM public.bookings WHERE id = v_pay.booking_id;

  IF v_b_status IS NULL THEN
    SELECT status, total_amount, user_id, booking_reference
      INTO v_sb_status, v_b_total, v_user_id, v_ref
    FROM public.service_bookings WHERE id = v_pay.booking_id;
    v_is_service := true;
  ELSE
    v_is_service := false;
  END IF;

  IF p_moyasar_status = 'paid' THEN
    -- Run the unified atomic confirmation
    v_res := public.confirm_paid_booking(
      v_pay.booking_id,
      CASE WHEN v_is_service THEN 'service' ELSE 'event' END,
      v_pay.provider_payment_id,
      p_moyasar_amount_halalas
    );
    RETURN jsonb_build_object('ok', true, 'action', 'confirmed', 'detail', v_res);
  END IF;

  -- Otherwise: failed/expired/cancelled → mark payment + booking as failed/expired
  UPDATE public.payments SET status = 'failed' WHERE id = p_payment_row_id;

  IF v_is_service THEN
    UPDATE public.service_bookings
       SET status = 'expired', updated_at = now()
     WHERE id = v_pay.booking_id AND status <> 'confirmed';
  ELSE
    -- Release seats then expire
    IF COALESCE(v_quantity,0) > 0 AND v_event_id IS NOT NULL AND v_b_status IN ('pending','pending_payment') THEN
      UPDATE public.events
         SET current_attendees = GREATEST(0, COALESCE(current_attendees,0) - v_quantity)
       WHERE id = v_event_id;
    END IF;
    UPDATE public.bookings
       SET status = 'expired', updated_at = now()
     WHERE id = v_pay.booking_id AND status <> 'confirmed';
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_user_id, 'booking_expired', 'انتهت صلاحية الحجز',
            'لم يكتمل الدفع لحجزك ' || COALESCE(v_ref,'') || '.',
            jsonb_build_object('booking_id', v_pay.booking_id, 'payment_id', v_pay.provider_payment_id,
                               'moyasar_status', p_moyasar_status));
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', 'expired', 'moyasar_status', p_moyasar_status);
END;
$function$;