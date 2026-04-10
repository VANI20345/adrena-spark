-- Add service availability columns to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS availability_type text DEFAULT 'full_day',
ADD COLUMN IF NOT EXISTS available_from time DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS available_to time DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS booking_duration_minutes integer DEFAULT 60;

-- Add time slot columns to service_bookings table
ALTER TABLE public.service_bookings 
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time;

-- Add index for faster conflict checking
CREATE INDEX IF NOT EXISTS idx_service_bookings_conflict_check 
ON public.service_bookings (service_id, service_date, start_time, end_time) 
WHERE status IN ('pending', 'pending_payment', 'confirmed');