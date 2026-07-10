INSERT INTO public.system_settings (key, value, description)
VALUES ('feature_toggles', '{"groups": true, "services": true, "trainings": true, "discounts": true}'::jsonb, 'Site-wide feature visibility toggles')
ON CONFLICT (key) DO NOTHING;