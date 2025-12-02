-- Create regional_groups table
CREATE TABLE IF NOT EXISTS public.regional_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regional_groups ENABLE ROW LEVEL SECURITY;

-- Admin can manage regional groups
CREATE POLICY "Admins can manage regional groups"
ON public.regional_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Everyone can view regional groups
CREATE POLICY "Regional groups viewable by everyone"
ON public.regional_groups
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_regional_groups_updated_at
BEFORE UPDATE ON public.regional_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();