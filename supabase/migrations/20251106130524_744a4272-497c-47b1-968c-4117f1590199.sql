-- Create user_interests table for storing available interests/hobbies
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view interests
CREATE POLICY "Interests are viewable by everyone"
ON public.user_interests
FOR SELECT
USING (true);

-- Only admins can manage interests
CREATE POLICY "Only admins can manage interests"
ON public.user_interests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default interests in Arabic
INSERT INTO public.user_interests (name, name_ar) VALUES
('hiking', 'المشي لمسافات طويلة'),
('climbing', 'تسلق الجبال'),
('camping', 'التخييم'),
('diving', 'الغوص'),
('surfing', 'ركوب الأمواج'),
('kayaking', 'التجديف بالكاياك'),
('cycling', 'ركوب الدراجات'),
('running', 'الجري'),
('photography', 'التصوير الفوتوغرافي'),
('offroad', 'القيادة على الطرق الوعرة'),
('paragliding', 'الطيران الشراعي'),
('skydiving', 'القفز بالمظلات'),
('skiing', 'التزلج'),
('snowboarding', 'التزلج على الجليد'),
('safari', 'السفاري'),
('fishing', 'صيد الأسماك'),
('archery', 'الرماية بالسهام'),
('yoga', 'اليوغا'),
('meditation', 'التأمل'),
('wildlife', 'مراقبة الحياة البرية')
ON CONFLICT (name) DO NOTHING;