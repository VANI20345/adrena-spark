-- Insert contact info settings if they don't exist
INSERT INTO public.system_settings (key, value, description) VALUES
  ('contact_phone', '{"primary": "+966 11 123 4567", "secondary": "+966 11 123 4568"}'::jsonb, 'Platform contact phone numbers'),
  ('contact_email', '{"primary": "info@hewaya.sa", "secondary": "support@hewaya.sa"}'::jsonb, 'Platform contact email addresses'),
  ('contact_address', '{"ar": "الرياض، المملكة العربية السعودية - طريق الملك فهد، حي العليا", "en": "Riyadh, Saudi Arabia - King Fahd Road, Olaya District"}'::jsonb, 'Platform physical address'),
  ('contact_working_hours', '{"ar": {"weekdays": "الأحد - الخميس: 9:00 ص - 6:00 م", "weekend": "الجمعة - السبت: مغلق"}, "en": {"weekdays": "Sun - Thu: 9:00 AM - 6:00 PM", "weekend": "Fri - Sat: Closed"}}'::jsonb, 'Platform working hours'),
  ('social_links', '{"twitter": "https://x.com/", "instagram": "https://instagram.com/", "youtube": "https://youtube.com/"}'::jsonb, 'Social media links')
ON CONFLICT (key) DO NOTHING;