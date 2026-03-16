-- ========================================
-- PHASE 4: Normalize Services Table
-- ========================================

-- Create training_service_details table for training-specific attributes
CREATE TABLE IF NOT EXISTS public.training_service_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid UNIQUE NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  trainer_name text,
  training_level text,
  duration_minutes integer,
  max_capacity integer,
  number_of_sets integer,
  duration_per_set integer,
  provided_services text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discount_service_details table for discount-specific attributes
CREATE TABLE IF NOT EXISTS public.discount_service_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid UNIQUE NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  original_price numeric NOT NULL,
  discount_percentage integer,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_schedules table for availability configuration
CREATE TABLE IF NOT EXISTS public.service_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  availability_type text,
  available_from time,
  available_to time,
  booking_duration_minutes integer,
  weekly_schedule jsonb,
  available_forever boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate training data from services to training_service_details
INSERT INTO public.training_service_details (service_id, trainer_name, training_level, duration_minutes, max_capacity, number_of_sets, duration_per_set, provided_services)
SELECT id, trainer_name, training_level, duration_minutes, max_capacity, number_of_sets, duration_per_set, provided_services
FROM public.services
WHERE service_type = 'training'
ON CONFLICT (service_id) DO NOTHING;

-- Migrate discount data from services to discount_service_details
INSERT INTO public.discount_service_details (service_id, original_price, discount_percentage, valid_from, valid_until)
SELECT id, COALESCE(original_price, price), discount_percentage, start_date::timestamptz, end_date::timestamptz
FROM public.services
WHERE service_type = 'discount' AND original_price IS NOT NULL
ON CONFLICT (service_id) DO NOTHING;

-- Migrate schedule data from services to service_schedules
INSERT INTO public.service_schedules (service_id, availability_type, available_from, available_to, booking_duration_minutes, weekly_schedule, available_forever)
SELECT id, availability_type, available_from::time, available_to::time, booking_duration_minutes, weekly_schedule, available_forever
FROM public.services
WHERE availability_type IS NOT NULL OR weekly_schedule IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.training_service_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_service_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_service_details
CREATE POLICY "Training details viewable by everyone" ON public.training_service_details FOR SELECT USING (true);
CREATE POLICY "Providers can manage own training details" ON public.training_service_details FOR ALL 
  USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()));

-- RLS policies for discount_service_details
CREATE POLICY "Discount details viewable by everyone" ON public.discount_service_details FOR SELECT USING (true);
CREATE POLICY "Providers can manage own discount details" ON public.discount_service_details FOR ALL 
  USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()));

-- RLS policies for service_schedules
CREATE POLICY "Service schedules viewable by everyone" ON public.service_schedules FOR SELECT USING (true);
CREATE POLICY "Providers can manage own service schedules" ON public.service_schedules FOR ALL 
  USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM services s WHERE s.id = service_id AND s.provider_id = auth.uid()));

-- Create view for complete service data (backward compatibility)
CREATE OR REPLACE VIEW public.services_complete AS
SELECT 
  s.*,
  tsd.trainer_name AS detail_trainer_name,
  tsd.training_level AS detail_training_level,
  tsd.duration_minutes AS detail_duration_minutes,
  tsd.max_capacity AS detail_max_capacity,
  tsd.number_of_sets AS detail_number_of_sets,
  tsd.duration_per_set AS detail_duration_per_set,
  tsd.provided_services AS detail_provided_services,
  dsd.original_price AS detail_original_price,
  dsd.discount_percentage AS detail_discount_percentage,
  dsd.valid_from AS detail_valid_from,
  dsd.valid_until AS detail_valid_until,
  ss.availability_type AS schedule_availability_type,
  ss.available_from AS schedule_available_from,
  ss.available_to AS schedule_available_to,
  ss.booking_duration_minutes AS schedule_booking_duration_minutes,
  ss.weekly_schedule AS schedule_weekly_schedule,
  ss.available_forever AS schedule_available_forever
FROM public.services s
LEFT JOIN public.training_service_details tsd ON tsd.service_id = s.id
LEFT JOIN public.discount_service_details dsd ON dsd.service_id = s.id
LEFT JOIN public.service_schedules ss ON ss.service_id = s.id;

-- Add updated_at triggers to new tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_training_service_details_updated_at ON public.training_service_details;
CREATE TRIGGER set_training_service_details_updated_at
  BEFORE UPDATE ON public.training_service_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_discount_service_details_updated_at ON public.discount_service_details;
CREATE TRIGGER set_discount_service_details_updated_at
  BEFORE UPDATE ON public.discount_service_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_service_schedules_updated_at ON public.service_schedules;
CREATE TRIGGER set_service_schedules_updated_at
  BEFORE UPDATE ON public.service_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();