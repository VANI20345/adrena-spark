-- Add foreign key constraint from services.provider_id to profiles.user_id
ALTER TABLE public.services
ADD CONSTRAINT fk_services_provider
FOREIGN KEY (provider_id) 
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key constraint from admin_activity_logs.admin_id to profiles.user_id
ALTER TABLE public.admin_activity_logs
ADD CONSTRAINT fk_admin_activity_logs_admin
FOREIGN KEY (admin_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);