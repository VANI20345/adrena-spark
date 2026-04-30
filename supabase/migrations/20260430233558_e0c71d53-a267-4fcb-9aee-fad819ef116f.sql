
INSERT INTO public.system_settings (key, value, description) VALUES
  ('commission_events', '{"percentage": 10}'::jsonb, 'نسبة عمولة المنصة على حجوزات الفعاليات'),
  ('commission_services', '{"percentage": 10}'::jsonb, 'نسبة عمولة المنصة على حجوزات الخدمات'),
  ('commission_training', '{"percentage": 10}'::jsonb, 'نسبة عمولة المنصة على حجوزات التدريب'),
  ('refund_policy', '{"early_days":7,"early_pct":100,"medium_days":3,"medium_pct":50,"late_pct":0}'::jsonb, 'سياسة الاسترداد التدريجية بناءً على الزمن قبل الفعالية')
ON CONFLICT (key) DO NOTHING;
