-- Add detail_images column to events table for gallery photos
ALTER TABLE events ADD COLUMN IF NOT EXISTS detail_images text[] DEFAULT '{}';

COMMENT ON COLUMN events.detail_images IS 'Array of additional image URLs for event gallery';