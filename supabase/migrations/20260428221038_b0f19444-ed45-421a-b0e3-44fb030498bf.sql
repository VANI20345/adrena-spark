INSERT INTO public.system_settings (key, value)
VALUES ('feature_toggles', '{"groups": true, "services": true, "trainings": true, "discounts": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;