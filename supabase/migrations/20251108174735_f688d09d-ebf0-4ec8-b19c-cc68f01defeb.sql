-- Create pricing plans table
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plan_name TEXT,
  plan_name_ar TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  ticket_limit INTEGER NOT NULL DEFAULT 10,
  available_tickets INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event schedules table
CREATE TABLE IF NOT EXISTS public.event_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_plans
CREATE POLICY "Everyone can view pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their event pricing plans"
  ON public.pricing_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = pricing_plans.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all pricing plans"
  ON public.pricing_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- RLS Policies for event_schedules
CREATE POLICY "Everyone can view event schedules"
  ON public.event_schedules FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their event schedules"
  ON public.event_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_schedules.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all event schedules"
  ON public.event_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_plans_event_id ON public.pricing_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_event_schedules_event_id ON public.event_schedules(event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();