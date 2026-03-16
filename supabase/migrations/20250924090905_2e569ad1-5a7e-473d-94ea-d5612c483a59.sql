-- Create service_bookings table for tracking service bookings
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  service_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  special_requests TEXT,
  booking_reference TEXT NOT NULL DEFAULT CONCAT('SB', EXTRACT(EPOCH FROM now())::TEXT)
);

-- Enable RLS
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_bookings
CREATE POLICY "Users can view their own service bookings" 
ON public.service_bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own service bookings" 
ON public.service_bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers can view bookings for their services" 
ON public.service_bookings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM services 
  WHERE services.id = service_bookings.service_id 
  AND services.provider_id = auth.uid()
));

CREATE POLICY "Providers can update bookings for their services" 
ON public.service_bookings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM services 
  WHERE services.id = service_bookings.service_id 
  AND services.provider_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_service_bookings_updated_at
BEFORE UPDATE ON public.service_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add revenue tracking to user_wallets with provider earnings
ALTER TABLE public.user_wallets 
ADD COLUMN IF NOT EXISTS pending_earnings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_service_revenue NUMERIC DEFAULT 0;