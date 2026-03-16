-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL CHECK (value > 0),
  description TEXT,
  description_ar TEXT,
  min_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  event_specific UUID REFERENCES events(id),
  user_specific UUID
);

-- Create storage buckets for files
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('event-images', 'event-images', true),
  ('documents', 'documents', false);

-- Create RLS policies for coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are viewable by everyone" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Only admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Create storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for event images bucket
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Organizers can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Event organizers can manage their images" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'event-images' AND auth.uid() IS NOT NULL);

-- Insert some sample coupons
INSERT INTO public.coupons (code, type, value, description, description_ar, min_amount, max_discount, usage_limit, valid_until) VALUES
  ('SAVE10', 'percentage', 10, '10% discount', 'خصم 10%', 50, 100, 100, now() + interval '30 days'),
  ('FLAT50', 'fixed', 50, '50 SAR discount', 'خصم 50 ريال', 200, NULL, 50, now() + interval '15 days'),
  ('WELCOME15', 'percentage', 15, '15% welcome discount', 'خصم 15% ترحيبي', 100, 150, 200, now() + interval '60 days'),
  ('EARLYBIRD', 'percentage', 20, '20% early bird discount', 'خصم 20% للحجز المبكر', 150, 200, 75, now() + interval '7 days');