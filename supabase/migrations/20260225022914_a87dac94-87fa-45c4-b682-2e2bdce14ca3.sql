CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- CRITICAL: Check if caller is an admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Log the deletion for audit trail
  INSERT INTO public.admin_activity_logs (admin_id, entity_type, entity_id, action, details)
  VALUES (
    auth.uid(),
    'user',
    target_user_id,
    'delete_user_completely',
    jsonb_build_object('deleted_at', now())
  );

  -- Delete from all related tables
  DELETE FROM public.bookings WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.loyalty_ledger WHERE user_id = target_user_id;
  DELETE FROM public.user_wallets WHERE user_id = target_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id = target_user_id;
  DELETE FROM public.bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.refunds WHERE user_id = target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = target_user_id;
  DELETE FROM public.user_gamification WHERE user_id = target_user_id;
  DELETE FROM public.user_suspensions WHERE user_id = target_user_id;
  DELETE FROM public.user_privacy_settings WHERE user_id = target_user_id;
  DELETE FROM public.profile_contacts WHERE user_id = target_user_id;
  DELETE FROM public.follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM public.follow_requests WHERE requester_id = target_user_id OR target_id = target_user_id;
  DELETE FROM public.group_memberships WHERE user_id = target_user_id;
  DELETE FROM public.group_join_requests WHERE user_id = target_user_id;
  DELETE FROM public.posts WHERE user_id = target_user_id;
  DELETE FROM public.comments WHERE user_id = target_user_id;
  DELETE FROM public.post_reactions WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Finally delete from auth.users (requires proper permissions)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;