-- Add joining restriction fields to event_groups table
ALTER TABLE event_groups 
ADD COLUMN IF NOT EXISTS min_age integer,
ADD COLUMN IF NOT EXISTS max_age integer,
ADD COLUMN IF NOT EXISTS gender_restriction text CHECK (gender_restriction IN ('all', 'male', 'female')),
ADD COLUMN IF NOT EXISTS location_restriction uuid REFERENCES cities(id);