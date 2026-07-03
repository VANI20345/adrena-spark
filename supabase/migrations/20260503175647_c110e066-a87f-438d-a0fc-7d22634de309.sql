
-- =========================================================
-- P1.1 — UNIQUE constraint on payment_holds(source_type, source_id)
-- =========================================================
-- Drop any duplicates first (defensive — table may be empty)
DELETE FROM public.payment_holds a
USING public.payment_holds b
WHERE a.id < b.id
  AND a.source_type = b.source_type
  AND a.source_id = b.source_id;

ALTER TABLE public.payment_holds
  DROP CONSTRAINT IF EXISTS payment_holds_source_unique;
ALTER TABLE public.payment_holds
  ADD CONSTRAINT payment_holds_source_unique UNIQUE (source_type, source_id);

-- =========================================================
-- P0.4 — request_withdrawal v2: strict available-balance check
-- =========================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_bank_name text, p_account_holder_name text,
  p_account_number text, p_iban text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wallet RECORD;
  v_min_reserve numeric := 50;
  v_min_withdrawal numeric := 100;
  v_pending_withdrawals numeric := 0;
  v_available numeric;
  v_ref text;
  v_request_id uuid;
  v_tx_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount < v_min_withdrawal THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount_below_minimum', 'minimum', v_min_withdrawal);
  END IF;

  IF p_bank_name IS NULL OR p_account_holder_name IS NULL OR p_account_number IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_bank_details');
  END IF;

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  -- Pending withdrawals already deducted in request_withdrawal flow (balance is decremented),
  -- but defensively also subtract any pending wallet_transactions of type 'withdraw'.
  SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_pending_withdrawals
  FROM public.wallet_transactions
  WHERE user_id = v_user_id AND type = 'withdraw' AND status = 'pending';

  -- Available = balance - held_balance - pending_withdrawals - reserve
  -- (balance already excludes held_balance since they are separate columns,
  --  but we subtract held_balance defensively to enforce policy.)
  v_available := GREATEST(0,
    COALESCE(v_wallet.balance, 0)
    - COALESCE(v_wallet.held_balance, 0)
    - v_pending_withdrawals
    - v_min_reserve
  );

  IF p_amount > v_available THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_balance',
      'available', v_available, 'reserve', v_min_reserve,
      'held_balance', COALESCE(v_wallet.held_balance, 0)
    );
  END IF;

  v_ref := 'WD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substring(v_user_id::text, 1, 8);

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, status, reference_id, reference_type
  ) VALUES (
    v_user_id, 'withdraw', -p_amount,
    'طلب سحب إلى ' || p_bank_name,
    'pending', v_ref, 'withdrawal'
  ) RETURNING id INTO v_tx_id;

  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_name, account_holder_name, account_number, iban,
    reference_number, wallet_transaction_id, status
  ) VALUES (
    v_user_id, p_amount, p_bank_name, p_account_holder_name, p_account_number, p_iban,
    v_ref, v_tx_id, 'pending'
  ) RETURNING id INTO v_request_id;

  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.financial_transaction_logs (
    transaction_type, amount, reference_type, reference_id,
    payer_id, receiver_id, status, metadata
  ) VALUES (
    'withdrawal_requested', p_amount, 'withdrawal', v_request_id,
    NULL, v_user_id, 'pending',
    jsonb_build_object(
      'reference', v_ref, 'bank_name', p_bank_name,
      'account_last4', right(p_account_number, 4),
      'iban_last4', CASE WHEN p_iban IS NOT NULL THEN right(p_iban, 4) ELSE NULL END,
      'available_at_request', v_available,
      'held_balance_at_request', COALESCE(v_wallet.held_balance, 0)
    )
  );

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id, 'withdrawal_requested',
    'تم استلام طلب السحب',
    'سيتم مراجعة طلب سحب ' || p_amount || ' ريال خلال 2-5 أيام عمل',
    jsonb_build_object('amount', p_amount, 'reference', v_ref, 'request_id', v_request_id)
  );

  RETURN jsonb_build_object(
    'ok', true, 'request_id', v_request_id,
    'reference', v_ref, 'amount', p_amount
  );
END;
$$;

-- =========================================================
-- P0.3 — confirm_paid_booking: atomic end-to-end confirmation
-- =========================================================
CREATE OR REPLACE FUNCTION public.confirm_paid_booking(
  p_booking_id uuid,
  p_booking_type text,
  p_payment_id text,
  p_provider_amount_halalas integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
BEGIN
  IF p_booking_id IS NULL OR p_booking_type IS NULL OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_params');
  END IF;

  v_booking_table := CASE WHEN p_booking_type = 'service' THEN 'service_bookings' ELSE 'bookings' END;

  -- Lock the booking row and load core fields
  IF p_booking_type = 'service' THEN
    SELECT user_id, total_amount, status, provider_id, COALESCE(quantity,1)
      INTO v_user_id, v_total, v_status, v_provider_id, v_quantity
    FROM public.service_bookings WHERE id = p_booking_id FOR UPDATE;
  ELSE
    SELECT b.user_id, b.total_amount, b.status, e.organizer_id, COALESCE(b.quantity,1), b.event_id
      INTO v_user_id, v_total, v_status, v_provider_id, v_quantity, v_event_id
    FROM public.bookings b
    LEFT JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id FOR UPDATE;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  -- Idempotency
  IF v_status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'already_confirmed', true);
  END IF;

  -- Optional amount check (if caller provides Moyasar amount in halalas)
  IF p_provider_amount_halalas IS NOT NULL THEN
    v_expected_halalas := ROUND(v_total * 100)::int;
    IF abs(v_expected_halalas - p_provider_amount_halalas) > 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'amount_mismatch',
        'expected', v_expected_halalas, 'received', p_provider_amount_halalas);
    END IF;
  END IF;

  -- Mark payment row completed
  UPDATE public.payments
     SET status = 'completed', completed_at = now()
   WHERE provider_payment_id = p_payment_id;

  -- Confirm booking
  IF p_booking_type = 'service' THEN
    UPDATE public.service_bookings
       SET status = 'confirmed', payment_id = p_payment_id, updated_at = now()
     WHERE id = p_booking_id AND status <> 'confirmed';
  ELSE
    UPDATE public.bookings
       SET status = 'confirmed', payment_id = p_payment_id, updated_at = now()
     WHERE id = p_booking_id AND status <> 'confirmed';
  END IF;

  -- Create hold + 70/30 split (idempotent via UNIQUE constraint inside the RPC)
  v_hold_res := public.create_payment_hold_with_split(p_booking_id, p_booking_type);
  IF (v_hold_res->>'ok')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'create_payment_hold_with_split failed: %', v_hold_res::text;
  END IF;

  -- Generate invoices (customer + provider)
  BEGIN
    v_inv_res := public.generate_booking_invoices(p_booking_id, p_booking_type);
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail confirmation on invoice generation, but log
    INSERT INTO public.system_logs(level, message, details, user_id)
    VALUES ('error', 'generate_booking_invoices failed inside confirm_paid_booking',
            jsonb_build_object('booking_id', p_booking_id, 'err', SQLERRM), v_user_id);
  END;

  -- User-side wallet transaction (negative payment)
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, status, reference_id, reference_type
  ) VALUES (
    v_user_id, 'payment', -v_total,
    CASE WHEN p_booking_type = 'event'
         THEN 'دفع حجز فعالية #' || substring(p_booking_id::text,1,8)
         ELSE 'دفع حجز خدمة #' || substring(p_booking_id::text,1,8) END,
    'completed', p_booking_id,
    CASE WHEN p_booking_type = 'event' THEN 'event_booking' ELSE 'service_booking' END
  );

  -- Tickets + attendees for events
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

  -- Loyalty (1%)
  v_points := floor(v_total * 0.01);
  IF v_points > 0 THEN
    INSERT INTO public.loyalty_ledger (user_id, points, type, description, reference_id, reference_type)
    VALUES (v_user_id, v_points, 'earned',
            'نقاط من الحجز ' || substring(p_booking_id::text,1,8),
            p_booking_id,
            CASE WHEN p_booking_type='event' THEN 'event_booking' ELSE 'service_booking' END);
  END IF;

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
$$;

GRANT EXECUTE ON FUNCTION public.confirm_paid_booking(uuid, text, text, integer) TO authenticated, service_role;
