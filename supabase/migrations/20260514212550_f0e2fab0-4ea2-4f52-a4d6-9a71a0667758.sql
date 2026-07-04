
SET LOCAL session_replication_role = 'replica';

-- Delete in dependency order
DELETE FROM public.financial_transaction_logs WHERE reference_id IN (SELECT id FROM public.bookings WHERE booking_reference LIKE 'P3TEST-%')
                                              OR reference_id IN (SELECT id FROM public.service_bookings WHERE booking_reference LIKE 'P3TEST-%');
DELETE FROM public.wallet_transactions WHERE reference_id IN (SELECT id FROM public.bookings WHERE booking_reference LIKE 'P3TEST-%')
                                         OR reference_id IN (SELECT id FROM public.service_bookings WHERE booking_reference LIKE 'P3TEST-%');
DELETE FROM public.payment_holds WHERE source_id IN (SELECT id FROM public.bookings WHERE booking_reference LIKE 'P3TEST-%')
                                   OR source_id IN (SELECT id FROM public.service_bookings WHERE booking_reference LIKE 'P3TEST-%');
DELETE FROM public.bookings WHERE booking_reference LIKE 'P3TEST-%';
DELETE FROM public.service_bookings WHERE booking_reference LIKE 'P3TEST-%';
DELETE FROM public.events WHERE title='P3 Test Event';
DELETE FROM public.services WHERE name IN ('P3 Test Service','P3 Test Training');

-- Reset wallet for the test provider that was zeroed/created during the harness
DELETE FROM public.user_wallets WHERE user_id = '31ff1ac6-9e58-436f-a32c-e7f416bb4217';

DROP TABLE IF EXISTS public.p3_test_results;
