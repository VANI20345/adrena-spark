-- Insert main service categories with their Arabic translations
INSERT INTO public.service_categories (name, name_ar, icon_name, is_active, display_order, parent_id) VALUES
-- Main Categories
('Audio & Lighting', 'الصوت والإضاءة', 'Volume2', true, 1, NULL),
('Furniture & Setup', 'الأثاث والتجهيزات', 'Sofa', true, 2, NULL),
('Catering & Hospitality', 'الضيافة والتموين', 'Coffee', true, 3, NULL),
('Security & Safety', 'الأمن والسلامة', 'Shield', true, 4, NULL),
('Photography & Media', 'التصوير والإعلام', 'Camera', true, 5, NULL),
('Transportation & Logistics', 'النقل والخدمات اللوجستية', 'Truck', true, 6, NULL),
('Entertainment & Activities', 'الترفيه والأنشطة', 'Music', true, 7, NULL),
('Technical Services', 'الخدمات التقنية', 'Laptop', true, 8, NULL),
('Support & Management', 'خدمات الدعم والإدارة', 'UserCog', true, 9, NULL),
('Special Services', 'الخدمات الخاصة', 'Star', true, 10, NULL),
('Other', 'أخرى', 'MoreHorizontal', true, 11, NULL);

-- Get IDs for subcategories (using a CTE for clarity)
WITH main_cats AS (
  SELECT id, name FROM public.service_categories WHERE parent_id IS NULL
)

-- Audio & Lighting subcategories
INSERT INTO public.service_categories (name, name_ar, icon_name, is_active, display_order, parent_id)
SELECT 'Speakers & Microphones Rental', 'إيجار سماعات / مايكروفونات', 'Mic', true, 1, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'Professional Sound Systems', 'أنظمة صوت احترافية', 'Radio', true, 2, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'DJ / Music Player', 'DJ / مشغّل موسيقى', 'Music', true, 3, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'Stage Lighting', 'إضاءة المسرح', 'Lightbulb', true, 4, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'Decorative Lighting', 'إضاءة ديكورية (LED, ليزر, سبوت لايت)', 'Zap', true, 5, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'Display Screens', 'شاشات عرض (LED Screen / Projector)', 'Monitor', true, 6, id FROM main_cats WHERE name = 'Audio & Lighting'
UNION ALL
SELECT 'Special Effects', 'مؤثرات خاصة (دخان، فقاعات، ليزر شو)', 'Sparkles', true, 7, id FROM main_cats WHERE name = 'Audio & Lighting'

-- Furniture & Setup subcategories
UNION ALL
SELECT 'Chairs & Tables', 'كراسي / طاولات / منصات / خيام', 'Armchair', true, 1, id FROM main_cats WHERE name = 'Furniture & Setup'
UNION ALL
SELECT 'Decorations', 'ديكورات (خلفيات، ستاندات، ورود صناعية)', 'Flower', true, 2, id FROM main_cats WHERE name = 'Furniture & Setup'
UNION ALL
SELECT 'Flooring', 'أرضيات (سجاد / موكيت)', 'Square', true, 3, id FROM main_cats WHERE name = 'Furniture & Setup'
UNION ALL
SELECT 'Barriers & Fences', 'حواجز وأسوار', 'Fence', true, 4, id FROM main_cats WHERE name = 'Furniture & Setup'

-- Catering & Hospitality subcategories
UNION ALL
SELECT 'Buffet & Meals', 'بوفيه مفتوح / وجبات فردية / مقبلات', 'UtensilsCrossed', true, 1, id FROM main_cats WHERE name = 'Catering & Hospitality'
UNION ALL
SELECT 'Beverages', 'مشروبات (عصائر، قهوة، شاي)', 'Coffee', true, 2, id FROM main_cats WHERE name = 'Catering & Hospitality'
UNION ALL
SELECT 'Food Trucks', 'عربات طعام (Food Trucks)', 'Truck', true, 3, id FROM main_cats WHERE name = 'Catering & Hospitality'
UNION ALL
SELECT 'Waitstaff Service', 'خدمة نُدُل', 'Users', true, 4, id FROM main_cats WHERE name = 'Catering & Hospitality'
UNION ALL
SELECT 'Tableware', 'أدوات المائدة', 'Utensils', true, 5, id FROM main_cats WHERE name = 'Catering & Hospitality'

-- Security & Safety subcategories
UNION ALL
SELECT 'Security Guards', 'حراس أمن / أجهزة كشف / بوابات', 'Shield', true, 1, id FROM main_cats WHERE name = 'Security & Safety'
UNION ALL
SELECT 'Crowd Management', 'إدارة الحشود', 'Users', true, 2, id FROM main_cats WHERE name = 'Security & Safety'
UNION ALL
SELECT 'First Aid', 'إسعافات أولية / سيارات إسعاف', 'Heart', true, 3, id FROM main_cats WHERE name = 'Security & Safety'
UNION ALL
SELECT 'Safety Equipment', 'معدات السلامة (طفايات حريق، إنذارات)', 'AlertTriangle', true, 4, id FROM main_cats WHERE name = 'Security & Safety'

-- Photography & Media subcategories
UNION ALL
SELECT 'Photography & Videography', 'تصوير فوتوغرافي / فيديو / تصوير درون', 'Camera', true, 1, id FROM main_cats WHERE name = 'Photography & Media'
UNION ALL
SELECT 'Live Streaming', 'بث مباشر', 'Radio', true, 2, id FROM main_cats WHERE name = 'Photography & Media'
UNION ALL
SELECT 'Editing & Production', 'مونتاج وإنتاج', 'Film', true, 3, id FROM main_cats WHERE name = 'Photography & Media'
UNION ALL
SELECT 'Photo Booth', 'طباعة صور فورية (Photo Booth)', 'Image', true, 4, id FROM main_cats WHERE name = 'Photography & Media'

-- Transportation & Logistics subcategories
UNION ALL
SELECT 'Buses & VIP Cars', 'باصات نقل جماعي / سيارات VIP / ليموزين', 'Bus', true, 1, id FROM main_cats WHERE name = 'Transportation & Logistics'
UNION ALL
SELECT 'Equipment Trucks', 'شاحنات معدات / رافعات شوكية', 'Truck', true, 2, id FROM main_cats WHERE name = 'Transportation & Logistics'
UNION ALL
SELECT 'Valet Service', 'خدمة صف سيارات (Valet)', 'ParkingCircle', true, 3, id FROM main_cats WHERE name = 'Transportation & Logistics'

-- Entertainment & Activities subcategories
UNION ALL
SELECT 'Musical & Theatrical Shows', 'عروض موسيقية / مسرحية', 'Music', true, 1, id FROM main_cats WHERE name = 'Entertainment & Activities'
UNION ALL
SELECT 'Kids Games', 'ألعاب للأطفال (منفوخات، ترامبولين)', 'Baby', true, 2, id FROM main_cats WHERE name = 'Entertainment & Activities'
UNION ALL
SELECT 'Magic Shows & Characters', 'عروض سحرية / شخصيات كرتونية / مفرقعات', 'Wand', true, 3, id FROM main_cats WHERE name = 'Entertainment & Activities'
UNION ALL
SELECT 'Sports Activities', 'أنشطة رياضية (تسلق، غوص، تحديات)', 'Dumbbell', true, 4, id FROM main_cats WHERE name = 'Entertainment & Activities'

-- Technical Services subcategories
UNION ALL
SELECT 'Ticketing Systems', 'أنظمة تذاكر / شاشات تفاعلية', 'Ticket', true, 1, id FROM main_cats WHERE name = 'Technical Services'
UNION ALL
SELECT 'Temporary WiFi', 'شبكة واي فاي مؤقتة', 'Wifi', true, 2, id FROM main_cats WHERE name = 'Technical Services'
UNION ALL
SELECT 'Registration Apps', 'تطبيقات تسجيل دخول / QR Code', 'Smartphone', true, 3, id FROM main_cats WHERE name = 'Technical Services'
UNION ALL
SELECT 'Professional AV Systems', 'أنظمة صوت وفيديو احترافية', 'MonitorSpeaker', true, 4, id FROM main_cats WHERE name = 'Technical Services'
UNION ALL
SELECT 'Live Broadcast Devices', 'أجهزة بث مباشر', 'Cast', true, 5, id FROM main_cats WHERE name = 'Technical Services'

-- Support & Management subcategories
UNION ALL
SELECT 'Cleaning & Maintenance', 'عمال نظافة وصيانة', 'Wrench', true, 1, id FROM main_cats WHERE name = 'Support & Management'
UNION ALL
SELECT 'Setup & Takedown Workers', 'عمال تركيب وفك', 'HardHat', true, 2, id FROM main_cats WHERE name = 'Support & Management'
UNION ALL
SELECT 'Event Managers', 'مدراء فعاليات / متطوعون', 'Briefcase', true, 3, id FROM main_cats WHERE name = 'Support & Management'
UNION ALL
SELECT 'Customer Service', 'خدمة عملاء / استقبال', 'HeadphonesIcon', true, 4, id FROM main_cats WHERE name = 'Support & Management'

-- Special Services subcategories
UNION ALL
SELECT 'Diving & Swimming Equipment', 'معدات غوص / سباحة', 'Waves', true, 1, id FROM main_cats WHERE name = 'Special Services'
UNION ALL
SELECT 'Bikes & Electric Cars', 'تأجير دراجات / سيارات كهربائية', 'Bike', true, 2, id FROM main_cats WHERE name = 'Special Services'
UNION ALL
SELECT 'Desert Trips', 'رحلات صحراوية (خيام، سفاري)', 'Tent', true, 3, id FROM main_cats WHERE name = 'Special Services'
UNION ALL
SELECT 'Special Sports Equipment', 'معدات رياضية خاصة (تسلق، كاياك، إلخ)', 'Mountain', true, 4, id FROM main_cats WHERE name = 'Special Services'
UNION ALL
SELECT 'Outdoor Cooking Equipment', 'معدات طهي خارجي', 'Flame', true, 5, id FROM main_cats WHERE name = 'Special Services';
