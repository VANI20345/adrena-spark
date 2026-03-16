-- Add new columns to services table for three service types
ALTER TABLE services
ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (service_type IN ('discount', 'training', 'other')),
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER CHECK (discount_percentage BETWEEN 1 AND 99),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
ADD COLUMN IF NOT EXISTS current_capacity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trainer_name TEXT,
ADD COLUMN IF NOT EXISTS training_level TEXT CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS number_of_sets INTEGER,
ADD COLUMN IF NOT EXISTS duration_per_set INTEGER,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS detail_images TEXT[],
ADD COLUMN IF NOT EXISTS provided_services TEXT[];

-- Create training_sets table for training service schedules
CREATE TABLE IF NOT EXISTS training_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  set_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  available_spots INTEGER NOT NULL,
  booked_spots INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on training_sets
ALTER TABLE training_sets ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_sets
CREATE POLICY "Everyone can view training sets"
  ON training_sets FOR SELECT
  USING (true);

CREATE POLICY "Service providers can manage their training sets"
  ON training_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = training_sets.service_id
      AND services.provider_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all training sets"
  ON training_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Create storage buckets for service media
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-thumbnails', 'service-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-thumbnails
CREATE POLICY "Service thumbnail images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-thumbnails');

CREATE POLICY "Providers can upload service thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers can update their service thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for service-images
CREATE POLICY "Service detail images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

CREATE POLICY "Providers can upload service images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers can update their service images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );