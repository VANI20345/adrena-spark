-- Fix the search_path security warning for the handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();