-- Add weekly_schedule column to services table for recurring time slots
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS weekly_schedule jsonb DEFAULT '{}'::jsonb;

-- Add available_forever flag
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS available_forever boolean DEFAULT false;

-- Add comment explaining the weekly_schedule structure
COMMENT ON COLUMN public.services.weekly_schedule IS 'JSON object with day names as keys and arrays of time slots as values. Example: {"monday": ["09:00", "14:00"], "tuesday": ["10:00"]}';

-- Create index for faster queries on weekly_schedule
CREATE INDEX IF NOT EXISTS idx_services_weekly_schedule ON public.services USING GIN (weekly_schedule);