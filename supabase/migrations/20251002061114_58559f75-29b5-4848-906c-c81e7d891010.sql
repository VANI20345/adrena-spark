-- Insert maintenance_mode setting if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES ('maintenance_mode', '{"enabled": false, "message": "الموقع تحت الصيانة حالياً"}'::jsonb, 'Maintenance mode settings')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;