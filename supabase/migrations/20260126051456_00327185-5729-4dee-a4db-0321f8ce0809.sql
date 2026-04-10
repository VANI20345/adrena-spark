-- Fix RLS policies for cities table to allow admins and super_admins to manage cities
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
DROP POLICY IF EXISTS "Admins and super_admins can manage cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can insert cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can update cities" ON public.cities;
DROP POLICY IF EXISTS "Admins can delete cities" ON public.cities;

-- Ensure RLS is enabled on cities table
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active cities (for forms, dropdowns, etc.)
CREATE POLICY "Anyone can view active cities" 
ON public.cities 
FOR SELECT 
USING (true);

-- Allow admins and super_admins to insert cities
CREATE POLICY "Admins and super_admins can insert cities" 
ON public.cities 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow admins and super_admins to update cities
CREATE POLICY "Admins and super_admins can update cities" 
ON public.cities 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Allow admins and super_admins to delete cities
CREATE POLICY "Admins and super_admins can delete cities" 
ON public.cities 
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);