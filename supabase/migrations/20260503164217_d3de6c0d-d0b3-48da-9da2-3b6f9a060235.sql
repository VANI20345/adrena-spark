
-- =========================================================
-- 7.1 — Rewrite generate_booking_invoices (customer + commission)
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_booking_invoices(
  p_booking_id uuid,
  p_booking_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_provider_id uuid;
  v_customer_id uuid;
  v_total numeric;
  v_commission numeric;
  v_commission_vat numeric;
  v_provider_earnings numeric;
  v_total_vat numeric;
  v_provider_name text;
  v_provider_vat text;
  v_customer_name text;
  v_platform_vat text;
  v_platform_name text := 'منصة هواية';
  v_customer_invoice_id uuid;
  v_provider_invoice_id uuid;
  v_ref_type text;
BEGIN
  v_platform_vat := COALESCE(
    NULLIF(REPLACE((SELECT (value)::text FROM public.system_settings WHERE key='platform_vat_number'),'"',''),''),
    ''
  );

  IF p_booking_type = 'service' THEN
    v_ref_type := 'service_booking';
    SELECT sb.user_id, sb.provider_id, sb.total_amount, sb.platform_commission,
           COALESCE(sb.vat_on_commission, 0), sb.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings
    FROM public.service_bookings sb WHERE sb.id = p_booking_id;
  ELSE
    v_ref_type := 'event_booking';
    SELECT b.user_id, e.organizer_id, b.total_amount, b.platform_commission,
           COALESCE(b.vat_on_commission, 0), b.provider_earnings
      INTO v_customer_id, v_provider_id, v_total, v_commission, v_commission_vat, v_provider_earnings
    FROM public.bookings b JOIN public.events e ON e.id = b.event_id
    WHERE b.id = p_booking_id;
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  -- Free booking → no invoices
  IF COALESCE(v_total,0) <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'free_booking');
  END IF;

  -- VAT extracted from total (VAT-inclusive 15%)
  v_total_vat := ROUND((v_total * 15.0 / 115.0)::numeric, 2);

  SELECT full_name, vat_number INTO v_provider_name, v_provider_vat
  FROM public.profiles WHERE user_id = v_provider_id;

  SELECT full_name INTO v_customer_name
  FROM public.profiles WHERE user_id = v_customer_id;

  -- Idempotent
  IF EXISTS (SELECT 1 FROM public.platform_invoices
             WHERE reference_id = p_booking_id AND reference_type = v_ref_type) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  -- ===== Customer invoice =====
  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, invoice_audience,
    reference_type, reference_id,
    customer_id, customer_name,
    provider_id, provider_name,
    platform_name, platform_vat_number,
    gross_amount, commission_rate, commission_amount,
    vat_on_commission, net_commission, provider_net_amount,
    invoice_date, status
  ) VALUES (
    public.generate_invoice_number(), 'customer', 'customer',
    v_ref_type, p_booking_id,
    v_customer_id, v_customer_name,
    v_provider_id, v_provider_name,
    v_platform_name, v_platform_vat,
    v_total, 0, 0,
    v_total_vat,                 -- VAT extracted from gross
    ROUND((v_total - v_total_vat)::numeric, 2),
    v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_customer_invoice_id;

  -- ===== Commission invoice (platform → provider) =====
  INSERT INTO public.platform_invoices (
    invoice_number, invoice_type, invoice_audience,
    reference_type, reference_id,
    customer_id, customer_name,
    provider_id, provider_name, provider_vat_number,
    platform_name, platform_vat_number,
    gross_amount, commission_rate, commission_amount,
    vat_on_commission, net_commission, provider_net_amount,
    invoice_date, status
  ) VALUES (
    public.generate_invoice_number(), 'commission', 'provider',
    v_ref_type, p_booking_id,
    v_customer_id, v_customer_name,
    v_provider_id, v_provider_name, v_provider_vat,
    v_platform_name, v_platform_vat,
    v_total, 0, v_commission,
    v_commission_vat,
    ROUND((v_commission - v_commission_vat)::numeric, 2),
    v_provider_earnings,
    now(), 'issued'
  ) RETURNING id INTO v_provider_invoice_id;

  RETURN jsonb_build_object(
    'ok', true,
    'customer_invoice_id', v_customer_invoice_id,
    'commission_invoice_id', v_provider_invoice_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_booking_invoices(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_booking_invoices(uuid, text) TO service_role;

-- =========================================================
-- 7.3 — Unify financial_transaction_logs types
-- =========================================================

-- Backfill existing rows to the canonical taxonomy
UPDATE public.financial_transaction_logs SET transaction_type='refund_approved'
  WHERE transaction_type IN ('refund_processed','refund_completed');
UPDATE public.financial_transaction_logs SET transaction_type='dispute_opened'
  WHERE transaction_type='hold_dispute_state_changed'
    AND COALESCE(metadata->>'to_review_state','') = 'dispute_hold';
UPDATE public.financial_transaction_logs SET transaction_type='dispute_closed'
  WHERE transaction_type='hold_dispute_state_changed';
DELETE FROM public.financial_transaction_logs
  WHERE transaction_type IN ('withdrawal_cancelled','withdrawal_approved','withdrawal_refund','manual_review','funds_released');

-- Hard whitelist via CHECK
ALTER TABLE public.financial_transaction_logs
  DROP CONSTRAINT IF EXISTS financial_transaction_logs_type_check;

ALTER TABLE public.financial_transaction_logs
  ADD CONSTRAINT financial_transaction_logs_type_check
  CHECK (transaction_type IN (
    'booking_payment','hold_created','hold_ready_for_review','hold_released',
    'dispute_opened','dispute_closed',
    'refund_requested','refund_approved',
    'withdrawal_requested','withdrawal_completed','withdrawal_rejected'
  ));

-- ----- request_refund: emit refund_requested, then delegate -----
CREATE OR REPLACE FUNCTION public.request_refund(p_booking_id uuid, p_booking_type text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_eligibility jsonb;
  v_owner uuid;
  v_existing uuid;
  v_refund_id uuid;
  v_pct numeric;
  v_amount numeric;
  v_status text;
  v_auto_process boolean;
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF p_booking_type NOT IN ('event','service') THEN RETURN jsonb_build_object('ok',false,'error','invalid_booking_type'); END IF;

  IF p_booking_type='service' THEN
    SELECT user_id INTO v_owner FROM public.service_bookings WHERE id=p_booking_id;
  ELSE
    SELECT user_id INTO v_owner FROM public.bookings WHERE id=p_booking_id;
  END IF;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('ok',false,'error','booking_not_found'); END IF;
  IF v_owner<>v_caller AND NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RETURN jsonb_build_object('ok',false,'error','unauthorized');
  END IF;

  SELECT id INTO v_existing FROM public.refunds
   WHERE booking_id=p_booking_id AND status NOT IN ('rejected','failed') LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok',false,'error','refund_already_exists','refund_id',v_existing);
  END IF;

  v_eligibility := public.calculate_refund_eligibility(p_booking_id, p_booking_type);
  IF NOT (v_eligibility->>'ok')::boolean THEN RETURN v_eligibility; END IF;

  v_pct := (v_eligibility->>'eligible_pct')::numeric;
  v_amount := (v_eligibility->>'eligible_amount')::numeric;
  v_auto_process := (v_pct > 0);
  v_status := CASE WHEN v_auto_process THEN 'pending' ELSE 'manual_review' END;

  INSERT INTO public.refunds
    (booking_id, user_id, amount, eligible_amount, eligible_pct, reason,
     status, refund_type, booking_type)
  VALUES
    (p_booking_id, v_owner, v_amount, v_amount, v_pct, p_reason,
     v_status, CASE WHEN v_auto_process THEN 'automatic' ELSE 'manual' END, p_booking_type)
  RETURNING id INTO v_refund_id;

  -- Single canonical log
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, status, reference_type, reference_id, payer_id, metadata)
  VALUES
    ('refund_requested', v_amount, 'pending', 'refund', v_refund_id, v_owner,
     jsonb_build_object('booking_id', p_booking_id, 'booking_type', p_booking_type,
                        'eligible_pct', v_pct, 'reason', p_reason,
                        'auto_process', v_auto_process));

  IF NOT v_auto_process THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'refund_manual_review',
           'Refund pending manual review',
           'Refund request requires admin decision',
           jsonb_build_object('refund_id', v_refund_id, 'booking_id', p_booking_id, 'reason', p_reason)
    FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');

    RETURN jsonb_build_object('ok',true,'refund_id',v_refund_id,'status',v_status,
                              'eligible_pct',v_pct,'auto_processed',false);
  END IF;

  v_result := public.process_refund(v_refund_id, NULL);
  RETURN jsonb_build_object('ok',true,'refund_id',v_refund_id,
                            'eligible_pct',v_pct,'auto_processed',true,'process_result',v_result);
END;
$function$;

-- ----- process_refund: rename log type to refund_approved -----
CREATE OR REPLACE FUNCTION public.process_refund(p_refund_id uuid, p_admin_override_amount numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_refund record; v_hold record; v_amount numeric;
  v_provider_id uuid; v_user_id uuid; v_wallet record;
  v_deduct_balance numeric := 0; v_deduct_held numeric := 0;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_admin(v_caller) OR public.is_super_admin(v_caller);
  SELECT * INTO v_refund FROM public.refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','refund_not_found'); END IF;
  IF v_refund.status NOT IN ('requested','pending','approved','manual_review') THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_status','current',v_refund.status);
  END IF;
  IF v_refund.status='manual_review' AND NOT v_is_admin THEN RETURN jsonb_build_object('ok',false,'error','admin_required'); END IF;
  IF p_admin_override_amount IS NOT NULL AND NOT v_is_admin THEN RETURN jsonb_build_object('ok',false,'error','admin_required'); END IF;

  v_amount := COALESCE(p_admin_override_amount, v_refund.eligible_amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    UPDATE public.refunds SET status='rejected', failure_reason='no_eligible_amount',
      processed_at=now(), processed_by=v_caller WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','no_eligible_amount');
  END IF;

  SELECT * INTO v_hold FROM public.payment_holds WHERE source_id=v_refund.booking_id LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.refunds SET status='manual_review', failure_reason='no_payment_hold_found', updated_at=now() WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','no_payment_hold_found');
  END IF;

  v_provider_id := v_hold.provider_id;
  v_user_id := v_refund.user_id;

  UPDATE public.refunds SET status='processing', updated_at=now() WHERE id=p_refund_id;

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id=v_provider_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.refunds SET status='manual_review', failure_reason='provider_wallet_missing', updated_at=now() WHERE id=p_refund_id;
    RETURN jsonb_build_object('ok',false,'error','provider_wallet_missing');
  END IF;

  IF v_wallet.balance >= v_amount THEN
    v_deduct_balance := v_amount; v_deduct_held := 0;
  ELSE
    v_deduct_balance := GREATEST(0, v_wallet.balance);
    v_deduct_held := v_amount - v_deduct_balance;
    IF v_deduct_held > COALESCE(v_wallet.held_balance,0) THEN
      UPDATE public.refunds SET status='manual_review',
        failure_reason='insufficient_provider_funds', updated_at=now() WHERE id=p_refund_id;
      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id,'refund_manual_review','Refund needs manual review',
        'Refund #'||substring(p_refund_id::text,1,8)||' — insufficient provider funds',
        jsonb_build_object('refund_id',p_refund_id,'reason','insufficient_provider_funds',
                           'required',v_amount,'available',v_wallet.balance+COALESCE(v_wallet.held_balance,0))
      FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');
      RETURN jsonb_build_object('ok',false,'error','insufficient_provider_funds',
        'required',v_amount,'available',v_wallet.balance+COALESCE(v_wallet.held_balance,0));
    END IF;
  END IF;

  UPDATE public.user_wallets
     SET balance = balance - v_deduct_balance,
         held_balance = COALESCE(held_balance,0) - v_deduct_held,
         total_refunded = COALESCE(total_refunded,0) + v_amount,
         updated_at = now()
   WHERE user_id = v_provider_id;

  UPDATE public.payment_holds
     SET status='refunded'::payment_hold_status,
         available_amount = GREATEST(0, COALESCE(available_amount,0) - v_deduct_balance),
         held_amount = GREATEST(0, COALESCE(held_amount,0) - v_deduct_held),
         updated_at = now()
   WHERE id = v_hold.id;

  INSERT INTO public.wallet_transactions
    (user_id,type,amount,description,status,reference_id,reference_type)
  VALUES
    (v_provider_id,'refund_deduction',-v_amount,
     'Refund deduction for booking #'||substring(v_refund.booking_id::text,1,8),
     'completed',p_refund_id,'refund');

  IF v_refund.booking_type='service' THEN
    UPDATE public.service_bookings SET status='refunded', updated_at=now() WHERE id=v_refund.booking_id;
  ELSE
    UPDATE public.bookings SET status='refunded' WHERE id=v_refund.booking_id;
  END IF;

  UPDATE public.refunds SET status='completed', amount=v_amount, payment_hold_id=v_hold.id,
    processed_at=now(), processed_by=v_caller,
    auto_processed=(v_refund.status IN ('requested','pending','approved') AND p_admin_override_amount IS NULL),
    failure_reason=NULL, updated_at=now() WHERE id=p_refund_id;

  -- Single canonical log
  INSERT INTO public.financial_transaction_logs
    (transaction_type, amount, net_amount, reference_type, reference_id,
     payer_id, receiver_id, status, metadata)
  VALUES
    ('refund_approved', v_amount, v_amount, 'refund', p_refund_id,
     v_provider_id, v_user_id, 'completed',
     jsonb_build_object('booking_id', v_refund.booking_id, 'hold_id', v_hold.id,
                        'deducted_from_balance', v_deduct_balance,
                        'deducted_from_held', v_deduct_held,
                        'processed_by', v_caller));

  INSERT INTO public.notifications (user_id, type, title, message, data) VALUES
    (v_user_id,'refund_completed','تم تنفيذ الاسترداد',
     'تم استرداد مبلغ '||v_amount::text||' ريال إلى محفظتك.',
     jsonb_build_object('refund_id',p_refund_id,'amount',v_amount)),
    (v_provider_id,'refund_deducted','تم خصم استرداد',
     'تم خصم '||v_amount::text||' ريال من رصيدك (استرداد لحجز).',
     jsonb_build_object('refund_id',p_refund_id,'amount',v_amount));

  PERFORM public.sync_hold_dispute_state(v_refund.booking_id);

  RETURN jsonb_build_object('ok',true,'refund_id',p_refund_id,'amount',v_amount,
    'deducted_balance',v_deduct_balance,'deducted_held',v_deduct_held);
END;
$function$;

-- ----- sync_hold_dispute_state: emit dispute_opened / dispute_closed -----
CREATE OR REPLACE FUNCTION public.sync_hold_dispute_state(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_hold record;
  v_has_dispute boolean;
  v_new_review hold_review_state;
  v_new_ext boolean;
  v_log_type text;
BEGIN
  IF p_booking_id IS NULL THEN RETURN; END IF;

  SELECT id, status, review_state, complaint_extension, hold_until, provider_id
    INTO v_hold
  FROM public.payment_holds WHERE source_id=p_booking_id LIMIT 1;
  IF NOT FOUND OR v_hold.status<>'held' THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.refunds
    WHERE booking_id=p_booking_id AND status IN ('pending','processing','requested')
  ) OR EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE booking_id = p_booking_id
      AND status IN ('open','replied','in_progress','pending')
  ) INTO v_has_dispute;

  IF v_has_dispute THEN
    v_new_ext := true; v_new_review := 'dispute_hold';
  ELSE
    v_new_ext := false;
    IF v_hold.hold_until <= now() THEN v_new_review := 'ready_for_release';
    ELSE v_new_review := 'pending'; END IF;
  END IF;

  IF v_hold.complaint_extension IS DISTINCT FROM v_new_ext
     OR v_hold.review_state IS DISTINCT FROM v_new_review THEN
    UPDATE public.payment_holds
       SET complaint_extension=v_new_ext, review_state=v_new_review, updated_at=now()
     WHERE id=v_hold.id;

    -- Map to canonical log type (only when dispute boundary changes)
    IF v_new_review='dispute_hold' AND v_hold.review_state<>'dispute_hold' THEN
      v_log_type := 'dispute_opened';
    ELSIF v_hold.review_state='dispute_hold' AND v_new_review<>'dispute_hold' THEN
      v_log_type := 'dispute_closed';
    ELSE
      v_log_type := NULL;
    END IF;

    IF v_log_type IS NOT NULL THEN
      INSERT INTO public.financial_transaction_logs
        (transaction_type, amount, status, reference_type, reference_id, metadata)
      VALUES
        (v_log_type, 0, 'completed', 'payment_hold', v_hold.id,
         jsonb_build_object('from_review_state', v_hold.review_state,
                            'to_review_state', v_new_review,
                            'booking_id', p_booking_id));

      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id, v_log_type,
             CASE WHEN v_log_type='dispute_opened' THEN 'Hold under dispute' ELSE 'Dispute resolved on hold' END,
             'Payment hold '||substring(v_hold.id::text,1,8)||' → '||v_new_review,
             jsonb_build_object('hold_id',v_hold.id,'booking_id',p_booking_id,'review_state',v_new_review)
      FROM public.user_roles ur WHERE ur.role IN ('admin','super_admin');
    END IF;
  END IF;
END;
$function$;

-- ----- admin_process_withdrawal: stop logging "approve" (no money flow) -----
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_request_id uuid, p_action text, p_notes text DEFAULT NULL, p_transfer_ref text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_admin UUID; v_req RECORD;
BEGIN
  v_admin := auth.uid();
  IF NOT public.has_any_role(v_admin, ARRAY['admin','super_admin']::app_role[]) THEN
    RETURN jsonb_build_object('ok',false,'error','unauthorized');
  END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','request_not_found'); END IF;

  IF p_action='approve' THEN
    IF v_req.status<>'pending' THEN RETURN jsonb_build_object('ok',false,'error','invalid_state','current',v_req.status); END IF;
    UPDATE public.withdrawal_requests SET status='approved', admin_notes=p_notes,
      processed_by=v_admin, processed_at=now() WHERE id=p_request_id;
    INSERT INTO public.notifications (user_id,type,title,message,data)
    VALUES (v_req.user_id,'withdrawal_approved','تمت الموافقة على طلب السحب',
            'تمت الموافقة على سحب '||v_req.amount||' ريال وسيتم التحويل قريباً',
            jsonb_build_object('request_id',p_request_id,'amount',v_req.amount));

  ELSIF p_action='complete' THEN
    IF v_req.status NOT IN ('approved','processing') THEN RETURN jsonb_build_object('ok',false,'error','invalid_state','current',v_req.status); END IF;
    UPDATE public.withdrawal_requests SET status='completed', external_transfer_ref=p_transfer_ref,
      admin_notes=COALESCE(p_notes,admin_notes), completed_at=now() WHERE id=p_request_id;
    UPDATE public.wallet_transactions SET status='completed' WHERE id=v_req.wallet_transaction_id;
    UPDATE public.user_wallets
      SET pending_earnings=GREATEST(0,COALESCE(pending_earnings,0)-v_req.amount),
          total_withdrawn=COALESCE(total_withdrawn,0)+v_req.amount, updated_at=now()
      WHERE user_id=v_req.user_id;

    INSERT INTO public.financial_transaction_logs
      (transaction_type,amount,reference_type,reference_id,payer_id,receiver_id,status,metadata)
    VALUES ('withdrawal_completed',v_req.amount,'withdrawal',p_request_id,NULL,v_req.user_id,'completed',
            jsonb_build_object('transfer_ref',p_transfer_ref,'admin_id',v_admin));

    INSERT INTO public.notifications (user_id,type,title,message,data)
    VALUES (v_req.user_id,'withdrawal_completed','تم تحويل المبلغ بنجاح',
            'تم تحويل '||v_req.amount||' ريال إلى حسابك البنكي',
            jsonb_build_object('request_id',p_request_id,'amount',v_req.amount,'transfer_ref',p_transfer_ref));

  ELSIF p_action='reject' THEN
    IF v_req.status NOT IN ('pending','approved') THEN RETURN jsonb_build_object('ok',false,'error','invalid_state','current',v_req.status); END IF;
    UPDATE public.withdrawal_requests SET status='rejected', rejection_reason=p_notes,
      processed_by=v_admin, processed_at=now() WHERE id=p_request_id;
    UPDATE public.user_wallets SET pending_earnings=GREATEST(0,COALESCE(pending_earnings,0)-v_req.amount),
      balance=COALESCE(balance,0)+v_req.amount, updated_at=now() WHERE user_id=v_req.user_id;
    UPDATE public.wallet_transactions SET status='failed',
      description=description||' (مرفوض: '||COALESCE(p_notes,'')||')' WHERE id=v_req.wallet_transaction_id;
    INSERT INTO public.wallet_transactions (user_id,type,amount,description,status,reference_id,reference_type)
    VALUES (v_req.user_id,'refund',v_req.amount,
            'استرجاع مبلغ سحب مرفوض - '||v_req.reference_number,'completed',v_req.reference_number,'withdrawal_refund');

    INSERT INTO public.financial_transaction_logs
      (transaction_type,amount,reference_type,reference_id,payer_id,receiver_id,status,metadata)
    VALUES ('withdrawal_rejected',v_req.amount,'withdrawal',p_request_id,NULL,v_req.user_id,'completed',
            jsonb_build_object('reason',p_notes,'admin_id',v_admin));

    INSERT INTO public.notifications (user_id,type,title,message,data)
    VALUES (v_req.user_id,'withdrawal_rejected','تم رفض طلب السحب',
            'تم رفض طلب السحب وإعادة المبلغ إلى محفظتك. السبب: '||COALESCE(p_notes,'غير محدد'),
            jsonb_build_object('request_id',p_request_id,'amount',v_req.amount,'reason',p_notes));
  ELSE
    RETURN jsonb_build_object('ok',false,'error','invalid_action');
  END IF;

  RETURN jsonb_build_object('ok',true,'request_id',p_request_id,'action',p_action);
END;
$function$;

-- ----- cancel_withdrawal_request: drop financial log (no money flow on user cancel) -----
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_request(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_user UUID; v_req RECORD;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id=p_request_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found_or_forbidden'); END IF;
  IF v_req.status<>'pending' THEN RETURN jsonb_build_object('ok',false,'error','cannot_cancel','current',v_req.status); END IF;

  UPDATE public.withdrawal_requests SET status='cancelled', processed_at=now() WHERE id=p_request_id;
  UPDATE public.user_wallets SET pending_earnings=GREATEST(0,COALESCE(pending_earnings,0)-v_req.amount),
    balance=COALESCE(balance,0)+v_req.amount, updated_at=now() WHERE user_id=v_user;
  UPDATE public.wallet_transactions SET status='cancelled' WHERE id=v_req.wallet_transaction_id;
  RETURN jsonb_build_object('ok',true);
END;
$function$;
