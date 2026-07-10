-- إضافة أعمدة مفقودة لجدول التصنيفات
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS icon_name text,
ADD COLUMN IF NOT EXISTS color_start text,
ADD COLUMN IF NOT EXISTS color_end text,
ADD COLUMN IF NOT EXISTS event_count integer DEFAULT 0;

-- إنشاء جدول المدن
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  region text,
  region_ar text,
  latitude numeric,
  longitude numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- إضافة المدن السعودية الرئيسية
INSERT INTO cities (name, name_ar, region, region_ar) VALUES
('Riyadh', 'الرياض', 'Central', 'الوسطى'),
('Jeddah', 'جدة', 'Western', 'الغربية'),
('Taif', 'الطائف', 'Western', 'الغربية'),
('Qassim', 'القصيم', 'Central', 'الوسطى'),
('Dammam', 'الدمام', 'Eastern', 'الشرقية'),
('Abha', 'أبها', 'Southern', 'الجنوبية'),
('Mecca', 'مكة المكرمة', 'Western', 'الغربية'),
('Medina', 'المدينة المنورة', 'Western', 'الغربية'),
('Khobar', 'الخبر', 'Eastern', 'الشرقية'),
('Jubail', 'الجبيل', 'Eastern', 'الشرقية'),
('Buraidah', 'بريدة', 'Central', 'الوسطى'),
('Yanbu', 'ينبع', 'Western', 'الغربية'),
('Khamis Mushait', 'خميس مشيط', 'Southern', 'الجنوبية'),
('Najran', 'نجران', 'Southern', 'الجنوبية'),
('Hail', 'حائل', 'Northern', 'الشمالية');

-- إنشاء جدول إحصائيات الموقع
CREATE TABLE IF NOT EXISTS site_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  stat_value_ar text NOT NULL,
  stat_value_en text NOT NULL,
  description_ar text,
  description_en text,
  icon_name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- إضافة الإحصائيات الأساسية
INSERT INTO site_statistics (stat_key, stat_value_ar, stat_value_en, description_ar, description_en, icon_name, display_order) VALUES
('monthly_events', '0+', '0+', 'فعالية شهرياً', 'Monthly Events', 'Calendar', 1),
('active_participants', '0+', '0+', 'مشارك نشط', 'Active Participants', 'Users', 2),
('certified_organizers', '0+', '0+', 'منظم معتمد', 'Certified Organizers', 'Trophy', 3),
('covered_cities', '15', '15', 'مدينة مغطاة', 'Covered Cities', 'MapPin', 4);

-- إنشاء جدول التقييمات المجمعة
CREATE TABLE IF NOT EXISTS rating_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('event', 'service')),
  average_rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  rating_1 integer DEFAULT 0,
  rating_2 integer DEFAULT 0,
  rating_3 integer DEFAULT 0,
  rating_4 integer DEFAULT 0,
  rating_5 integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(entity_id, entity_type)
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_summaries ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان للجداول الجديدة
CREATE POLICY "Cities are viewable by everyone" ON cities FOR SELECT USING (true);
CREATE POLICY "Only admins can manage cities" ON cities FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Site statistics are viewable by everyone" ON site_statistics FOR SELECT USING (true);
CREATE POLICY "Only admins can manage statistics" ON site_statistics FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Rating summaries are viewable by everyone" ON rating_summaries FOR SELECT USING (true);