-- Create service_categories table for hierarchical categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  parent_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Service categories are viewable by everyone
CREATE POLICY "Service categories are viewable by everyone"
ON public.service_categories
FOR SELECT
USING (is_active = true);

-- Only admins can manage service categories
CREATE POLICY "Only admins can manage service categories"
ON public.service_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert main event categories (these will be parent categories)
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order) VALUES
  ('Audio & Lighting', 'الصوت والإضاءة', NULL, 1),
  ('Furniture & Setup', 'الأثاث والتجهيزات', NULL, 2),
  ('Catering & Hospitality', 'التموين والضيافة', NULL, 3),
  ('Security & Safety', 'الأمن والسلامة', NULL, 4),
  ('Photography & Media', 'التصوير والإعلام', NULL, 5),
  ('Transportation & Logistics', 'النقل والخدمات اللوجستية', NULL, 6),
  ('Entertainment & Activities', 'الترفيه والأنشطة', NULL, 7),
  ('Technical Services', 'الخدمات التقنية', NULL, 8),
  ('Support & Management', 'الدعم والإدارة', NULL, 9),
  ('Special Services', 'خدمات خاصة', NULL, 10),
  ('Other', 'أخرى', NULL, 999);

-- Insert Audio & Lighting subcategories
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order)
SELECT 'Speaker Rental', 'تأجير سماعات', id, 1 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Microphones', 'ميكروفونات (سلكية/لاسلكية)', id, 2 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Sound Systems', 'أنظمة صوت احترافية', id, 3 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'DJ Services', 'دي جي / مشغل موسيقى', id, 4 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Stage Lighting', 'إضاءة المسارح', id, 5 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Decorative Lighting', 'إضاءة زينة (LED، ليزر، كشافات)', id, 6 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Display Screens', 'شاشات عرض (شاشة LED / بروجكتور)', id, 7 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL
UNION ALL
SELECT 'Special Effects', 'مؤثرات خاصة (دخان – فقاعات – عرض ليزر)', id, 8 FROM public.service_categories WHERE name = 'Audio & Lighting' AND parent_id IS NULL;

-- Insert Furniture & Setup subcategories
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order)
SELECT 'Chairs', 'كراسي', id, 1 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Tables', 'طاولات', id, 2 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Stages', 'منصات', id, 3 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Tents', 'خيام (مفتوحة/مغلقة)', id, 4 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Decorations', 'ديكورات (خلفيات، ستاندات، ورود صناعية)', id, 5 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Flooring', 'أرضيات (سجاد/موكيت)', id, 6 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL
UNION ALL
SELECT 'Barriers', 'حواجز / سياجات', id, 7 FROM public.service_categories WHERE name = 'Furniture & Setup' AND parent_id IS NULL;

-- Insert Catering & Hospitality subcategories  
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order)
SELECT 'Open Buffet', 'بوفيه مفتوح', id, 1 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Individual Meals', 'وجبات فردية', id, 2 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Appetizers', 'مقبلات / وجبات خفيفة', id, 3 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Beverages', 'مشروبات (عصائر، قهوة، شاي)', id, 4 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Food Trucks', 'عربات طعام', id, 5 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Waiter Service', 'خدمة نادلين', id, 6 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL
UNION ALL
SELECT 'Tableware', 'أدوات مائدة (صحون، أكواب، شوك، ملاعق)', id, 7 FROM public.service_categories WHERE name = 'Catering & Hospitality' AND parent_id IS NULL;

-- Insert Security & Safety subcategories
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order)
SELECT 'Security Guards', 'حراس أمن', id, 1 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL
UNION ALL
SELECT 'Security Devices', 'أجهزة أمنية (بوابات، كواشف يدوية)', id, 2 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL
UNION ALL
SELECT 'Crowd Control', 'تنظيم الحشود', id, 3 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL
UNION ALL
SELECT 'First Aid', 'إسعافات أولية', id, 4 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL
UNION ALL
SELECT 'Emergency Ambulances', 'سيارات إسعاف طوارئ', id, 5 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL
UNION ALL
SELECT 'Safety Equipment', 'معدات سلامة (طفايات، إنذارات)', id, 6 FROM public.service_categories WHERE name = 'Security & Safety' AND parent_id IS NULL;

-- Continue with other categories...
INSERT INTO public.service_categories (name, name_ar, parent_id, display_order)
SELECT 'Photography', 'تصوير فوتوغرافي', id, 1 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL
UNION ALL
SELECT 'Videography', 'تصوير فيديو', id, 2 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL
UNION ALL
SELECT 'Drone Shooting', 'تصوير بالطائرة المسيّرة (درون)', id, 3 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL
UNION ALL
SELECT 'Live Streaming', 'بث مباشر', id, 4 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL
UNION ALL
SELECT 'Editing & Production', 'مونتاج وإنتاج', id, 5 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL
UNION ALL
SELECT 'Photo Booth', 'طباعة صور فورية (فوتو بوث)', id, 6 FROM public.service_categories WHERE name = 'Photography & Media' AND parent_id IS NULL;