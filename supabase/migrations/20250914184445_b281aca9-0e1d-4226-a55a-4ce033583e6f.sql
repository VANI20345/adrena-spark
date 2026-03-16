-- Update the handle_new_user function to not automatically assign a role
-- This allows users to be redirected to the account-type selection page

DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile with full name from metadata or fallback to email
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  -- Create user wallet
  INSERT INTO public.user_wallets (user_id)
  VALUES (new.id);
  
  -- Create notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
  -- DO NOT automatically assign a role - let users choose on account-type page
  
  RETURN new;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();