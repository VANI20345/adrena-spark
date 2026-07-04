
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_amount_positive;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_amount_positive CHECK (total_amount >= 0);
ALTER TABLE public.service_bookings DROP CONSTRAINT IF EXISTS service_bookings_total_amount_positive;
ALTER TABLE public.service_bookings ADD CONSTRAINT service_bookings_total_amount_positive CHECK (total_amount >= 0);
NOTIFY pgrst, 'reload schema';
