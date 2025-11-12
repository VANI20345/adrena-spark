-- Insert adventure categories with Arabic names and appropriate icons
INSERT INTO categories (name, name_ar, description, description_ar, icon_name, color_start, color_end, event_count) VALUES
('Hiking', 'هايكنق', 'Mountain and trail hiking adventures', 'مغامرات المشي في الجبال والمسارات', 'Mountain', 'emerald-500', 'green-600', 0),
('Diving', 'غوص', 'Underwater diving and marine exploration', 'الغوص تحت الماء واستكشاف البحر', 'Waves', 'blue-500', 'cyan-600', 0),
('Camping', 'تخييم', 'Outdoor camping and wilderness experiences', 'التخييم في الطبيعة والبرية', 'Tent', 'orange-500', 'amber-600', 0),
('Paragliding', 'طيران شراعي', 'Paragliding and aerial adventures', 'الطيران الشراعي والمغامرات الجوية', 'Wind', 'sky-500', 'blue-600', 0),
('Motorcycling', 'دراجات نارية', 'Motorcycle adventures and tours', 'مغامرات الدراجات النارية والجولات', 'Bike', 'red-500', 'rose-600', 0),
('Swimming', 'سباحة', 'Swimming and water sports', 'السباحة والرياضات المائية', 'Waves', 'teal-500', 'cyan-600', 0),
('Sand Skiing', 'تزلج الرمال', 'Sand dune skiing and desert sports', 'التزلج على الكثبان الرملية والرياضات الصحراوية', 'Mountain', 'yellow-500', 'orange-600', 0),
('Horseback Riding', 'ركوب الخيل', 'Equestrian adventures and horse riding', 'مغامرات الفروسية وركوب الخيل', 'Zap', 'purple-500', 'violet-600', 0),
('Rock Climbing', 'تسلق الصخور', 'Rock climbing and mountaineering', 'تسلق الصخور والجبال', 'Mountain', 'slate-500', 'gray-600', 0),
('Desert Safari', 'سفاري صحراوي', 'Desert exploration and safari adventures', 'استكشاف الصحراء ومغامرات السفاري', 'Car', 'amber-500', 'yellow-600', 0),
('Water Sports', 'رياضات مائية', 'Various water sports and activities', 'رياضات وأنشطة مائية متنوعة', 'Waves', 'blue-400', 'teal-600', 0),
('Adventure Racing', 'سباق المغامرات', 'Multi-sport adventure racing', 'سباقات المغامرات متعددة الرياضات', 'Trophy', 'green-500', 'emerald-600', 0)
ON CONFLICT (name) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  icon_name = EXCLUDED.icon_name,
  color_start = EXCLUDED.color_start,
  color_end = EXCLUDED.color_end;