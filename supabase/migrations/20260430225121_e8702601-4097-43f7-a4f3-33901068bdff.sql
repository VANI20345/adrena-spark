
-- ============================================================
-- PART 1: EXTEND ENUMS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_hold_status' AND e.enumlabel = 'under_review') THEN
    ALTER TYPE payment_hold_status ADD VALUE 'under_review';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- enum doesn't exist, skip
  NULL;
END $$;

-- ============================================================
-- PART 2: EXTEND payment_holds
-- ============================================================
ALTER TABLE public.payment_holds
  ADD COLUMN IF NOT EXISTS available_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_table text,
  ADD COLUMN IF NOT EXISTS auto_split_percent integer DEFAULT 70;

CREATE INDEX IF NOT EXISTS idx_payment_holds_source ON public.payment_holds(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_provider ON public.payment_holds(provider_id, status);

-- ============================================================
-- PART 3: EXTEND user_wallets
-- ============================================================
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS held_balance numeric NOT NULL DEFAULT 0;

-- ============================================================
-- PART 4: EXTEND system_settings (key/value rows)
-- ============================================================
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('platform_vat_number', '""', 'ZATCA VAT registration number for the platform'),
  ('payment_hold_hours', '72', 'Hours to hold provider funds after event/service end'),
  ('wallet_split_immediate_percent', '70', 'Percentage of provider earnings released immediately to wallet')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- PART 5: EXTEND profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vat_number text;

-- ============================================================
-- PART 6: EXTEND platform_invoices
-- ============================================================
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS invoice_audience text DEFAULT 'provider' CHECK (invoice_audience IN ('customer', 'provider')),
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_vat_number text;

CREATE INDEX IF NOT EXISTS idx_platform_invoices_customer ON public.platform_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_provider ON public.platform_invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_reference ON public.platform_invoices(reference_type, reference_id);

-- ============================================================
-- PART 7: HELPER — get setting value as int/text
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_system_setting(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.system_settings WHERE key = p_key LIMIT 1;
$$;

-- ============================================================
-- PART 8: RPC — create_payment_hold_with_split
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_payment_hold_with_split(
  p_booking_id uuid,
  p_booking_type text -- 'event' or 'service'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_provider_id uuid;
  v_user_id uuid;
  v_total numeric;
  v_provider_earnings numeric;
  v_platform_commission numeric;
  v_vat numeric;
  v_immediate_pct integer;
  v_hold_hours integer;
  v_available numeric;
  v_held numeric;
  v_event_end timestamptz;
  v_hold_until timestamptz;
  v_hold_id uuid;
  v_existing_hold uuid;
  v_source_type text;
  v_booking_table text;
BEGIN
  -- Idempotency: skip if hold already exists for this booking
  SELECT id INTO v_existing_hold
  FROM public.payment_holds
  WHERE source_id = p_booking_id
  LIMIT 1;
  
  IF v_existing_hold IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'hold_id', v_existing_hold, 'skipped', true);
  END IF;

  -- Load settings
  v_immediate_pct := COALESCE((SELECT (value)::text::integer FROM public.system_settings WHERE key = 'wallet_split_immediate_percent'), 70);
  v_hold_hours := COALESCE((SELECT (value)::text::integer FROM public.system_settings WHERE key = 'payment_hold_hours'), 72);

  IF p_booking_type = 'service' THEN
    v_booking_table := 'service_bookings';
    v_source_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.provider_earnings, 
           sb.platform_commission, sb.vat_amount,
           CASE WHEN sb.service_date IS NOT NULL AND sb.end_time IS NOT NULL 
                THEN (substring(sb.service_date from 1 for 10) || ' ' || sb.end_time)::timestamptz
                ELSE now() END
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings, 
           v_platform_commission, v_vat, v_event_end
    FROM public.service_bookings sb
    WHERE sb.id = p_booking_id;
  ELSE
    v_booking_table := 'bookings';
    v_source_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.provider_earnings,
           b.platform_commission, COALESCE(b.vat_on_commission, b.vat_amount),
           e.end_date
      INTO v_user_id, v_provider_id, v_total, v_provider_earnings,
           v_platform_commission, v_vat, v_event_end
    FROM public.bookings b
    JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_or_provider_not_found');
  END IF;

  v_provider_earnings := COALESCE(v_provider_earnings, 0);
  v_platform_commission := COALESCE(v_platform_commission, 0);
  v_vat := COALESCE(v_vat, 0);

  -- Compute split on provider_earnings (NET, after platform commission)
  v_available := ROUND((v_provider_earnings * v_immediate_pct / 100.0)::numeric, 2);
  v_held := ROUND((v_provider_earnings - v_available)::numeric, 2);

  -- Hold ends 72h after event end (or now if past)
  v_hold_until := GREATEST(now(), COALESCE(v_event_end, now())) + (v_hold_hours || ' hours')::interval;

  -- Create the hold
  INSERT INTO public.payment_holds (
    source_type, source_id, provider_id, payer_id,
    gross_amount, platform_fee, vat_amount, net_amount,
    available_amount, held_amount,
    currency, status, event_end_at, hold_until,
    complaint_extension, booking_table, auto_split_percent
  ) VALUES (
    v_source_type::payment_hold_source_type, p_booking_id, v_provider_id, v_user_id,
    v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_available, v_held,
    'SAR', 'held'::payment_hold_status, v_event_end, v_hold_until,
    false, v_booking_table, v_immediate_pct
  )
  RETURNING id INTO v_hold_id;

  -- Credit 70% to provider wallet immediately + add 30% to held_balance
  INSERT INTO public.user_wallets (user_id, balance, total_earned, held_balance)
  VALUES (v_provider_id, v_available, v_available, v_held)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + EXCLUDED.balance,
        total_earned = public.user_wallets.total_earned + EXCLUDED.balance,
        held_balance = public.user_wallets.held_balance + EXCLUDED.held_balance,
        updated_at = now();

  -- Wallet transaction: immediate earning (70%)
  IF v_available > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, type, amount, description, status, reference_id, reference_type
    ) VALUES (
      v_provider_id, 'earning', v_available,
      'إيرادات فورية (70%) من حجز #' || substring(p_booking_id::text, 1, 8),
      'completed', p_booking_id, v_source_type
    );
  END IF;

  -- Financial log: immediate split
  INSERT INTO public.financial_transaction_logs (
    transaction_type, amount, commission_amount, vat_amount, net_amount,
    reference_type, reference_id, payer_id, receiver_id, status, service_type, metadata
  ) VALUES (
    'hold_created', v_total, v_platform_commission, v_vat, v_provider_earnings,
    v_source_type, p_booking_id, v_user_id, v_provider_id, 'completed', p_booking_type,
    jsonb_build_object(
      'hold_id', v_hold_id,
      'available_amount', v_available,
      'held_amount', v_held,
      'split_percent', v_immediate_pct,
      'hold_until', v_hold_until
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'hold_id', v_hold_id,
    'available_amount', v_available,
    'held_amount', v_held,
    'hold_until', v_hold_until
  );
END;
$$;

-- ============================================================
-- PART 9: RPC — release_payment_hold (rewrite to credit wallet)
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_payment_hold(
  p_hold_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_hold FROM public.payment_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_hold.status NOT IN ('held', 'under_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'current_status', v_hold.status);
  END IF;

  IF v_hold.complaint_extension THEN
    RETURN jsonb_build_object('ok', false, 'error', 'complaint_active');
  END IF;

  -- Mark released
  UPDATE public.payment_holds
  SET status = 'released',
      released_at = now(),
      released_by = auth.uid(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_hold_id;

  -- Move held_amount from held_balance to balance in wallet
  IF COALESCE(v_hold.held_amount, 0) > 0 THEN
    UPDATE public.user_wallets
    SET balance = balance + v_hold.held_amount,
        held_balance = GREATEST(0, held_balance - v_hold.held_amount),
        total_earned = total_earned + v_hold.held_amount,
        updated_at = now()
    WHERE user_id = v_hold.provider_id;

    -- Wallet transaction
    INSERT INTO public.wallet_transactions (
      user_id, type, amount, description, status, reference_id, reference_type
    ) VALUES (
      v_hold.provider_id, 'release', v_hold.held_amount,
      'إفراج عن المبلغ المحجوز (30%) من حجز #' || substring(v_hold.source_id::text, 1, 8),
      'completed', v_hold.source_id, v_hold.source_type::text
    );

    -- Financial log
    INSERT INTO public.financial_transaction_logs (
      transaction_type, amount, net_amount, reference_type, reference_id,
      payer_id, receiver_id, status, metadata
    ) VALUES (
      'hold_released', v_hold.held_amount, v_hold.held_amount,
      v_hold.source_type::text, v_hold.source_id,
      NULL, v_hold.provider_id, 'completed',
      jsonb_build_object('hold_id', p_hold_id, 'released_by', auth.uid(), 'notes', p_notes)
    );

    -- Notify provider
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_hold.provider_id, 'funds_released',
      'تم الإفراج عن أموالك المحجوزة',
      'تم تحويل ' || v_hold.held_amount::text || ' ريال من المبلغ المحجوز إلى رصيدك المتاح.',
      jsonb_build_object('hold_id', p_hold_id, 'amount', v_hold.held_amount)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'hold_id', p_hold_id, 'amount', v_hold.held_amount);
END;
$$;

-- ============================================================
-- PART 10: RPC — get_provider_available_balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_provider_available_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
BEGIN
  SELECT balance, held_balance, total_earned, total_withdrawn
  INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('balance', 0, 'held_balance', 0, 'available_for_withdrawal', 0);
  END IF;

  RETURN jsonb_build_object(
    'balance', COALESCE(v_wallet.balance, 0),
    'held_balance', COALESCE(v_wallet.held_balance, 0),
    'total_earned', COALESCE(v_wallet.total_earned, 0),
    'total_withdrawn', COALESCE(v_wallet.total_withdrawn, 0),
    'available_for_withdrawal', GREATEST(0, COALESCE(v_wallet.balance, 0))
  );
END;
$$;

-- ============================================================
-- PART 11: RPC — get_financial_dashboard_stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_financial_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'total_payments', COALESCE((SELECT SUM(gross_amount) FROM public.payment_holds), 0),
    'total_platform_revenue', COALESCE((SELECT SUM(platform_fee) FROM public.payment_holds), 0),
    'total_provider_earnings', COALESCE((SELECT SUM(net_amount) FROM public.payment_holds), 0),
    'total_held', COALESCE((SELECT SUM(held_amount) FROM public.payment_holds WHERE status IN ('held', 'under_review')), 0),
    'total_available_released', COALESCE((SELECT SUM(available_amount) FROM public.payment_holds), 0),
    'total_released_30', COALESCE((SELECT SUM(held_amount) FROM public.payment_holds WHERE status = 'released'), 0),
    'count_held', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held'),
    'count_under_review', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'under_review' OR (status = 'held' AND complaint_extension = true)),
    'count_ready', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'held' AND complaint_extension = false AND hold_until <= now()),
    'count_released', (SELECT COUNT(*) FROM public.payment_holds WHERE status = 'released'),
    'total_vat_collected', COALESCE((SELECT SUM(vat_amount) FROM public.payment_holds), 0),
    'pending_withdrawals', COALESCE((SELECT SUM(ABS(amount)) FROM public.wallet_transactions WHERE type = 'withdraw' AND status = 'pending'), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- PART 12: RPC — generate_booking_invoices
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_booking_invoices(
  p_booking_id uuid,
  p_booking_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_provider_id uuid;
  v_customer_id uuid;
  v_total numeric;
  v_commission numeric;
  v_vat numeric;
  v_provider_earnings numeric;
  v_provider_name text;
  v_provider_vat text;
  v_customer_name text;
  v_platform_vat text;
  v_customer_invoice_id uuid;
  v_provider_invoice_id uuid;
  v_ref_type text;
BEGIN
  v_platform_vat := COALESCE((SELECT (value)::text FROM public.system_settings WHERE key = 'platform_vat_number'), '""');
  v_platform_vat := REPLACE(v_platform_vat, '"', '');

  IF p_booking_type = 'service' THEN
    v_ref_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.platform_commission, 
           COALESCE(sb.vat_amount, 0), sb.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_vat, v_provider_earnings
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_ref_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.platform_commission,
           COALESCE(b.vat_on_commission, b.vat_amount, 0), b.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_vat, v_provider_earnings
    FROM public.bookings b
    JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  SELECT full_name, vat_number INTO v_provider_name, v_provider_vat
  FROM public.profiles WHERE user_id = v_provider_id;

  SELECT full_name INTO v_customer_name
  FROM public.profiles WHERE user_id = v_customer_id;

  -- Skip if invoices already exist
  IF EXISTS (SELECT 1 FROM public.platform_invoices WHERE reference_id = p_booking_id AND reference_type = v_ref_type) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  -- Customer invoice
  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, reference_type, reference_id,
    invoice_audience, customer_id, customer_name,
    provider_id, provider_name,
    platform_name, platform_vat_number,
    gross_amount, commission_amount, vat_on_commission, net_to_provider,
    issued_at, status
  ) VALUES (
    public.generate_invoice_number(), 'simplified', v_ref_type, p_booking_id,
    'customer', v_customer_id, v_customer_name,
    v_provider_id, v_provider_name,
    'منصة هواية', v_platform_vat,
    v_total, v_commission, v_vat, v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_customer_invoice_id;

  -- Provider invoice
  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, reference_type, reference_id,
    invoice_audience, customer_id, customer_name,
    provider_id, provider_name, provider_vat_number,
    platform_name, platform_vat_number,
    gross_amount, commission_amount, vat_on_commission, net_to_provider,
    issued_at, status
  ) VALUES (
    public.generate_invoice_number(), 'simplified', v_ref_type, p_booking_id,
    'provider', v_customer_id, v_customer_name,
    v_provider_id, v_provider_name, v_provider_vat,
    'منصة هواية', v_platform_vat,
    v_total, v_commission, v_vat, v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_provider_invoice_id;

  RETURN jsonb_build_object(
    'ok', true,
    'customer_invoice_id', v_customer_invoice_id,
    'provider_invoice_id', v_provider_invoice_id
  );
END;
$$;

-- ============================================================
-- PART 13: TRIGGERS — auto-flag holds on disputes
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_refund_flag_payment_hold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_ref uuid;
BEGIN
  v_booking_ref := COALESCE(NEW.booking_id, NEW.service_booking_id);
  IF v_booking_ref IS NULL THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status <> 'pending') THEN
    UPDATE public.payment_holds
    SET complaint_extension = true,
        complaint_reason = 'refund_request:' || NEW.id::text,
        status = CASE WHEN status = 'held' THEN 'under_review'::payment_hold_status ELSE status END,
        updated_at = now()
    WHERE source_id = v_booking_ref AND status IN ('held', 'under_review');
  END IF;

  -- Re-open if refund resolved
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'completed') THEN
    -- Only un-flag if no other pending refunds and no open tickets
    IF NOT EXISTS (
      SELECT 1 FROM public.refunds r2
      WHERE COALESCE(r2.booking_id, r2.service_booking_id) = v_booking_ref
        AND r2.status = 'pending' AND r2.id <> NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE (st.metadata->>'booking_id')::uuid = v_booking_ref
        AND st.status IN ('open', 'in_progress')
    ) THEN
      UPDATE public.payment_holds
      SET complaint_extension = false,
          status = CASE WHEN status = 'under_review' THEN 'held'::payment_hold_status ELSE status END,
          updated_at = now()
      WHERE source_id = v_booking_ref AND complaint_extension = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_flag_hold ON public.refunds;
CREATE TRIGGER trg_refund_flag_hold
AFTER INSERT OR UPDATE ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.tg_refund_flag_payment_hold();

-- ============================================================
-- PART 14: RLS — payment_holds (provider can view own)
-- ============================================================
DROP POLICY IF EXISTS "Providers can view their own payment holds" ON public.payment_holds;
CREATE POLICY "Providers can view their own payment holds"
ON public.payment_holds FOR SELECT
TO authenticated
USING (provider_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- platform_invoices RLS
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own invoices" ON public.platform_invoices;
CREATE POLICY "Customers can view their own invoices"
ON public.platform_invoices FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Providers can view their own invoices" ON public.platform_invoices;
CREATE POLICY "Providers can view their own invoices"
ON public.platform_invoices FOR SELECT
TO authenticated
USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Super admins manage all invoices" ON public.platform_invoices;
CREATE POLICY "Super admins manage all invoices"
ON public.platform_invoices FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- financial_transaction_logs RLS
ALTER TABLE public.financial_transaction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins view all financial logs" ON public.financial_transaction_logs;
CREATE POLICY "Super admins view all financial logs"
ON public.financial_transaction_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view their own financial logs" ON public.financial_transaction_logs;
CREATE POLICY "Users view their own financial logs"
ON public.financial_transaction_logs FOR SELECT
TO authenticated
USING (payer_id = auth.uid() OR receiver_id = auth.uid());
