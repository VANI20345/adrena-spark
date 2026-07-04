ALTER TABLE public.financial_transaction_logs DROP CONSTRAINT financial_transaction_logs_type_check;
ALTER TABLE public.financial_transaction_logs ADD CONSTRAINT financial_transaction_logs_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'booking_payment','hold_created','hold_not_required','hold_ready_for_review','hold_released',
    'dispute_opened','dispute_closed','refund_requested','refund_approved',
    'withdrawal_requested','withdrawal_completed','withdrawal_rejected'
  ]));

INSERT INTO public.financial_transaction_logs (
  transaction_type, amount, commission_amount, vat_amount, net_amount,
  payer_id, receiver_id, reference_type, reference_id, service_type, status, metadata
)
SELECT 'hold_not_required', 0, ph.platform_fee, ph.vat_amount, ph.net_amount,
       ph.payer_id, ph.provider_id, ph.source_type::text, ph.source_id, 'hold', 'released',
       jsonb_build_object(
         'hold_pct', 0, 'immediate_pct', 100, 'hold_id', ph.id,
         'available_amount', ph.available_amount, 'held_amount', 0,
         'review_state', ph.review_state::text, 'backfilled', true
       )
FROM public.payment_holds ph
WHERE ph.held_amount = 0
  AND ph.review_state = 'no_hold_required'
  AND NOT EXISTS (
    SELECT 1 FROM public.financial_transaction_logs ftl
    WHERE ftl.reference_id = ph.source_id
      AND ftl.transaction_type IN ('hold_created','hold_not_required')
  );