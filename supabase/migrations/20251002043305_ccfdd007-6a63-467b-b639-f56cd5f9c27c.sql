-- Create system_settings maintenance_mode if not exists
INSERT INTO system_settings (key, value, description)
VALUES (
  'maintenance_mode',
  '{"enabled": false, "message": "الموقع تحت الصيانة حالياً"}'::jsonb,
  'System maintenance mode setting'
)
ON CONFLICT (key) DO NOTHING;

-- Create admin function to delete user completely
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from all related tables
  DELETE FROM public.bookings WHERE user_id = target_user_id;
  DELETE FROM public.tickets WHERE booking_id IN (SELECT id FROM public.bookings WHERE user_id = target_user_id);
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.loyalty_ledger WHERE user_id = target_user_id;
  DELETE FROM public.user_wallets WHERE user_id = target_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id = target_user_id;
  DELETE FROM public.event_bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.refunds WHERE user_id = target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Finally delete from auth.users (requires proper permissions)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (admins will use it)
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;