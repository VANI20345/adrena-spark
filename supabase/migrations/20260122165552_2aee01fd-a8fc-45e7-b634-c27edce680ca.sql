-- Create admin permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admin can manage permissions
CREATE POLICY "Super admins can manage permissions"
ON public.admin_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy: Admins can read permissions
CREATE POLICY "Admins can read permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Create super_admin activity logs table (separate from admin logs)
CREATE TABLE IF NOT EXISTS public.super_admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admins can view super admin logs
CREATE POLICY "Super admins can view super admin logs"
ON public.super_admin_activity_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Create admin performance stats table
CREATE TABLE IF NOT EXISTS public.admin_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  events_approved INTEGER DEFAULT 0,
  events_rejected INTEGER DEFAULT 0,
  services_approved INTEGER DEFAULT 0,
  services_rejected INTEGER DEFAULT 0,
  providers_approved INTEGER DEFAULT 0,
  providers_rejected INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  reports_handled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.admin_performance_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all admin performance
CREATE POLICY "Super admins can view all admin performance"
ON public.admin_performance_stats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy: Admins can view their own performance
CREATE POLICY "Admins can view own performance"
ON public.admin_performance_stats
FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

-- Create financial transactions log for super admin
CREATE TABLE IF NOT EXISTS public.financial_transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  payer_id UUID,
  receiver_id UUID,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_transaction_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view financial logs
CREATE POLICY "Super admins can view financial logs"
ON public.financial_transaction_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Insert default permissions for admin role
INSERT INTO public.admin_permissions (role, permission_key, is_enabled) VALUES
  ('admin', 'manage_events', true),
  ('admin', 'manage_services', true),
  ('admin', 'manage_users', true),
  ('admin', 'manage_categories', true),
  ('admin', 'manage_groups', true),
  ('admin', 'view_reports', true),
  ('admin', 'manage_tickets', true),
  ('admin', 'send_notifications', true),
  ('admin', 'view_activity_logs', true),
  ('super_admin', 'manage_events', true),
  ('super_admin', 'manage_services', true),
  ('super_admin', 'manage_users', true),
  ('super_admin', 'manage_categories', true),
  ('super_admin', 'manage_groups', true),
  ('super_admin', 'view_reports', true),
  ('super_admin', 'manage_tickets', true),
  ('super_admin', 'send_notifications', true),
  ('super_admin', 'view_activity_logs', true),
  ('super_admin', 'manage_roles', true),
  ('super_admin', 'view_financials', true),
  ('super_admin', 'manage_system', true),
  ('super_admin', 'view_admin_performance', true),
  ('super_admin', 'manage_permissions', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.admin_permissions ap ON ur.role = ap.role
    WHERE ur.user_id = _user_id 
    AND ap.permission_key = _permission_key 
    AND ap.is_enabled = true
  )
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'super_admin'
  )
$$;