-- Populate user_interests table with comprehensive adventure tags
INSERT INTO user_interests (id, name, name_ar) VALUES
  (gen_random_uuid(), 'Hiking', 'المشي لمسافات طويلة'),
  (gen_random_uuid(), 'Rock Climbing', 'تسلق الصخور'),
  (gen_random_uuid(), 'Mountain Biking', 'ركوب الدراجات الجبلية'),
  (gen_random_uuid(), 'Camping', 'التخييم'),
  (gen_random_uuid(), 'Kayaking', 'ركوب الكاياك'),
  (gen_random_uuid(), 'Surfing', 'ركوب الأمواج'),
  (gen_random_uuid(), 'Scuba Diving', 'الغوص'),
  (gen_random_uuid(), 'Paragliding', 'الطيران الشراعي'),
  (gen_random_uuid(), 'Desert Safari', 'رحلات الصحراء'),
  (gen_random_uuid(), 'Off-Road Driving', 'القيادة على الطرق الوعرة'),
  (gen_random_uuid(), 'Skydiving', 'القفز بالمظلات'),
  (gen_random_uuid(), 'Bungee Jumping', 'القفز بالحبل'),
  (gen_random_uuid(), 'Trail Running', 'الجري على الممرات'),
  (gen_random_uuid(), 'Archery', 'الرماية بالقوس'),
  (gen_random_uuid(), 'Horse Riding', 'ركوب الخيل'),
  (gen_random_uuid(), 'Cave Exploration', 'استكشاف الكهوف'),
  (gen_random_uuid(), 'Wildlife Photography', 'تصوير الحياة البرية'),
  (gen_random_uuid(), 'Yoga & Meditation', 'اليوغا والتأمل'),
  (gen_random_uuid(), 'Beach Activities', 'أنشطة الشاطئ'),
  (gen_random_uuid(), 'Water Sports', 'الرياضات المائية'),
  (gen_random_uuid(), 'Winter Sports', 'الرياضات الشتوية'),
  (gen_random_uuid(), 'Adventure Photography', 'تصوير المغامرات'),
  (gen_random_uuid(), 'Survival Skills', 'مهارات البقاء'),
  (gen_random_uuid(), 'Fishing', 'صيد السمك'),
  (gen_random_uuid(), 'Canyoning', 'التجديف في الأخاديد'),
  (gen_random_uuid(), 'Zip Lining', 'الانزلاق بالحبل'),
  (gen_random_uuid(), 'ATV Riding', 'قيادة المركبات الرباعية'),
  (gen_random_uuid(), 'Sandboarding', 'التزلج على الرمال'),
  (gen_random_uuid(), 'Stand-Up Paddleboarding', 'التجديف واقفاً'),
  (gen_random_uuid(), 'Snorkeling', 'الغطس')
ON CONFLICT (id) DO NOTHING;

-- Create group_interests junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES user_interests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, interest_id)
);

-- Enable RLS on group_interests
ALTER TABLE group_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_interests
CREATE POLICY "Everyone can view group interests"
  ON group_interests FOR SELECT
  USING (true);

CREATE POLICY "Group creators can manage interests"
  ON group_interests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_groups
      WHERE event_groups.id = group_interests.group_id
      AND event_groups.created_by = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_interests_group_id ON group_interests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_interests_interest_id ON group_interests(interest_id);