-- Add group_id column to events table to link events to groups
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES event_groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);

-- Add comment for documentation
COMMENT ON COLUMN events.group_id IS 'Links an event to a specific group. Null if event is not associated with any group.';