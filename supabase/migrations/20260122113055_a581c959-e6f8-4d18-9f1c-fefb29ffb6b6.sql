-- Create entity_reports table for comprehensive reporting system
CREATE TABLE IF NOT EXISTS public.entity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'group', 'post', 'comment', 'event', 'service', 'user'
  entity_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  additional_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Users can create reports" 
ON public.entity_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" 
ON public.entity_reports 
FOR SELECT 
USING (auth.uid() = reporter_id);

-- Policy: Admins can view and update all reports
CREATE POLICY "Admins can view all reports" 
ON public.entity_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update reports" 
ON public.entity_reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for efficient queries
CREATE INDEX idx_entity_reports_entity ON public.entity_reports(entity_type, entity_id);
CREATE INDEX idx_entity_reports_status ON public.entity_reports(status);
CREATE INDEX idx_entity_reports_reporter ON public.entity_reports(reporter_id);

-- Trigger for updated_at
CREATE TRIGGER update_entity_reports_updated_at
BEFORE UPDATE ON public.entity_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();