-- إضافة أعمدة مفقودة لجدول التصنيفات
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS icon_name text,
ADD COLUMN IF NOT EXISTS color_start text,
ADD COLUMN IF NOT EXISTS color_end text,
ADD COLUMN IF NOT EXISTS event_count integer DEFAULT 0;

-- تحديث التصنيفات الموجودة بالبيانات الصحيحة
INSERT INTO categories (name, name_ar, description, description_ar, icon_name, color_start, color_end, event_count) VALUES
('Hiking', 'هايكنج', 'Explore the most beautiful mountain trails', 'استكشف أجمل المسارات الجبلية', 'Mountain', 'green-500', 'emerald-600', 0),
('Diving', 'غوص', 'Discover the Red Sea world', 'اكتشف عالم البحر الأحمر', 'Waves', 'blue-500', 'cyan-600', 0),
('Camping', 'تخييم', 'Magical nights under the stars', 'ليالي سحرية تحت النجوم', 'Tent', 'orange-500', 'amber-600', 0),
('Cycling', 'دراجات هوائية', 'Fun tours in nature', 'جولات ممتعة في الطبيعة', 'Bike', 'purple-500', 'violet-600', 0),
('Motorcycles', 'دراجات نارية', 'Speed and thrill adventures', 'مغامرات السرعة والإثارة', 'Car', 'red-500', 'rose-600', 0),
('Rock Climbing', 'تسلق جبال', 'Challenge mountain peaks', 'تحدى قمم الجبال', 'Mountain', 'gray-500', 'slate-600', 0),
('Swimming', 'سباحة', 'Various water activities', 'فعاليات مائية متنوعة', 'Waves', 'teal-500', 'blue-600', 0),
('Sandboarding', 'تزلج رمال', 'Adventure in sand dunes', 'مغامرة في الكثبان الرملية', 'Wind', 'yellow-500', 'orange-600', 0),
('Paragliding', 'طيران شراعي', 'Fly in the sky', 'حلق في السماء', 'Wind', 'indigo-500', 'blue-600', 0),
('Horseback Riding', 'ركوب خيل', 'Horseback tours', 'رحلات على ظهر الخيول', 'Compass', 'amber-500', 'yellow-600', 0)
ON CONFLICT (name) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  icon_name = EXCLUDED.icon_name,
  color_start = EXCLUDED.color_start,
  color_end = EXCLUDED.color_end;

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
('Hail', 'حائل', 'Northern', 'الشمالية')
ON CONFLICT (name) DO NOTHING;

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
('covered_cities', '15', '15', 'مدينة مغطاة', 'Covered Cities', 'MapPin', 4)
ON CONFLICT (stat_key) DO NOTHING;

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

-- إنشاء دالة لتحديث إحصائيات التقييمات
CREATE OR REPLACE FUNCTION update_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث إحصائيات التقييمات للفعالية أو الخدمة
  INSERT INTO rating_summaries (entity_id, entity_type, average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5)
  VALUES (
    COALESCE(NEW.event_id, NEW.service_id),
    CASE WHEN NEW.event_id IS NOT NULL THEN 'event' ELSE 'service' END,
    0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (entity_id, entity_type) DO NOTHING;

  -- إعادة حساب الإحصائيات
  WITH rating_stats AS (
    SELECT 
      COALESCE(event_id, service_id) as entity_id,
      CASE WHEN event_id IS NOT NULL THEN 'event' ELSE 'service' END as entity_type,
      AVG(rating::numeric) as avg_rating,
      COUNT(*) as total,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as r1,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as r2,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as r3,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as r4,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as r5
    FROM reviews 
    WHERE COALESCE(event_id, service_id) = COALESCE(NEW.event_id, NEW.service_id)
    GROUP BY COALESCE(event_id, service_id), CASE WHEN event_id IS NOT NULL THEN 'event' ELSE 'service' END
  )
  UPDATE rating_summaries 
  SET 
    average_rating = rating_stats.avg_rating,
    total_reviews = rating_stats.total,
    rating_1 = rating_stats.r1,
    rating_2 = rating_stats.r2,
    rating_3 = rating_stats.r3,
    rating_4 = rating_stats.r4,
    rating_5 = rating_stats.r5,
    updated_at = now()
  FROM rating_stats
  WHERE rating_summaries.entity_id = rating_stats.entity_id 
    AND rating_summaries.entity_type = rating_stats.entity_type;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة تريجر لتحديث إحصائيات التقييمات
CREATE TRIGGER update_rating_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_rating_summary();

-- إنشاء دالة لتحديث عدد الفعاليات في كل تصنيف
CREATE OR REPLACE FUNCTION update_category_event_count()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث عدد الفعاليات في التصنيف الجديد (في حالة الإدراج أو التحديث)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.category_id IS NOT NULL) THEN
    UPDATE categories 
    SET event_count = (
      SELECT COUNT(*) FROM events 
      WHERE category_id = NEW.category_id AND status = 'approved'
    )
    WHERE id = NEW.category_id;
  END IF;

  -- تحديث عدد الفعاليات في التصنيف القديم (في حالة التحديث أو الحذف)
  IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL AND OLD.category_id != NEW.category_id THEN
    UPDATE categories 
    SET event_count = (
      SELECT COUNT(*) FROM events 
      WHERE category_id = OLD.category_id AND status = 'approved'
    )
    WHERE id = OLD.category_id;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL THEN
    UPDATE categories 
    SET event_count = (
      SELECT COUNT(*) FROM events 
      WHERE category_id = OLD.category_id AND status = 'approved'
    )
    WHERE id = OLD.category_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إضافة تريجر لتحديث عدد الفعاليات في التصنيفات
CREATE TRIGGER update_category_event_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION update_category_event_count();

-- تحديث عدد الفعاليات الحالي لجميع التصنيفات
UPDATE categories 
SET event_count = (
  SELECT COUNT(*) FROM events 
  WHERE events.category_id = categories.id AND events.status = 'approved'
);