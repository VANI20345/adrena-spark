-- Add provider-specific fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS service_types text[], -- Array of service types
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS id_document_url text,
ADD COLUMN IF NOT EXISTS commercial_registration_url text,
ADD COLUMN IF NOT EXISTS license_url text,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));

-- Create storage bucket for provider documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for provider-documents bucket
CREATE POLICY "Providers can upload their documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can view their documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all provider documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);