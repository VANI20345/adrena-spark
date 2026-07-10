-- Migration: Fix booking amount check constraints to allow free bookings (0 amount)
-- Table: public.bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_amount_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_amount_check CHECK (total_amount >= 0::numeric);

-- Table: public.service_bookings
ALTER TABLE public.service_bookings DROP CONSTRAINT IF EXISTS service_bookings_total_amount_check;
ALTER TABLE public.service_bookings ADD CONSTRAINT service_bookings_total_amount_check CHECK (total_amount >= 0::numeric);
