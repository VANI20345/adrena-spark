-- =============================================
-- COMPREHENSIVE FINANCIAL SYSTEM MIGRATION
-- VAT-Inclusive Pricing Model with Invoice Prep
-- =============================================

-- 1. Add financial tracking columns to service_bookings
ALTER TABLE public.service_bookings 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_on_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_discounted boolean DEFAULT false;

-- 2. Add financial tracking columns to bookings (events)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_on_commission numeric DEFAULT 0;

-- 3. Create platform_invoices table for ZATCA-ready invoice data
-- This table stores all the data needed for future ZATCA API integration
-- NO external API calls - just data preparation
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Invoice identification
  invoice_number text NOT NULL UNIQUE,
  invoice_type text NOT NULL DEFAULT 'simplified', -- 'simplified' or 'standard'
  
  -- Reference to booking
  reference_type text NOT NULL, -- 'event_booking', 'service_booking'
  reference_id uuid NOT NULL,
  
  -- Provider info (seller for ZATCA)
  provider_id uuid NOT NULL,
  provider_name text,
  provider_vat_number text,
  
  -- Buyer info (platform - Hiwayaa)
  platform_name text DEFAULT 'Hiwayaa',
  platform_vat_number text,
  
  -- Financial breakdown (all amounts in SAR)
  gross_amount numeric NOT NULL, -- Total amount paid by user
  commission_rate numeric NOT NULL, -- Commission percentage
  commission_amount numeric NOT NULL, -- Platform commission (VAT-inclusive)
  vat_on_commission numeric NOT NULL, -- VAT extracted from commission (15%)
  net_commission numeric NOT NULL, -- Commission minus VAT
  provider_net_amount numeric NOT NULL, -- Amount provider receives
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'generated', 'submitted', 'accepted', 'rejected'
  
  -- ZATCA-specific fields (to be populated when API is integrated)
  zatca_invoice_hash text,
  zatca_qr_code text,
  zatca_submission_id text,
  zatca_clearance_status text,
  zatca_submitted_at timestamp with time zone,
  zatca_response jsonb,
  
  -- Timestamps
  invoice_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_platform_invoices_reference ON public.platform_invoices(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_provider ON public.platform_invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON public.platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_date ON public.platform_invoices(invoice_date);

-- 5. Enable RLS on platform_invoices
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for platform_invoices
-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices" 
ON public.platform_invoices 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Providers can view their own invoices
CREATE POLICY "Providers can view their own invoices" 
ON public.platform_invoices 
FOR SELECT 
USING (provider_id = auth.uid());

-- Only system can insert/update invoices (via service role)
CREATE POLICY "System can manage invoices" 
ON public.platform_invoices 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- 7. Add financial transaction logs table for detailed audit trail
ALTER TABLE public.financial_transaction_logs
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.platform_invoices(id),
ADD COLUMN IF NOT EXISTS service_type text;

-- 8. Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
  year_part text;
  sequence_num integer;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || year_part || '-(\d+)') AS integer)
  ), 0) + 1 INTO sequence_num
  FROM public.platform_invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  new_number := 'INV-' || year_part || '-' || LPAD(sequence_num::text, 6, '0');
  
  RETURN new_number;
END;
$$;

-- 9. Create trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER update_platform_invoices_updated_at
BEFORE UPDATE ON public.platform_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Add comment for documentation
COMMENT ON TABLE public.platform_invoices IS 'Stores platform commission invoices for ZATCA compliance. API integration pending - currently stores data only.';

-- 11. Add index on services for better query performance
CREATE INDEX IF NOT EXISTS idx_services_status_type ON public.services(status, service_type);
CREATE INDEX IF NOT EXISTS idx_services_approved ON public.services(status) WHERE status = 'approved';