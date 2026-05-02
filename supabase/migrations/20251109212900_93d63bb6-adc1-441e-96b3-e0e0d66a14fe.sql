-- Add description field to event_schedules table for day-specific details
ALTER TABLE event_schedules 
ADD COLUMN IF NOT EXISTS day_description TEXT;