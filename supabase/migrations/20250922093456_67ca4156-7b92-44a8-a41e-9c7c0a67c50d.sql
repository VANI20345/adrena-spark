-- Add foreign key constraints for services table
ALTER TABLE public.services 
ADD CONSTRAINT fk_services_provider_id 
FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.services 
ADD CONSTRAINT fk_services_category_id 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add foreign key constraints for events table
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_organizer_id 
FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.events 
ADD CONSTRAINT fk_events_category_id 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add foreign key constraints for bookings table  
ALTER TABLE public.bookings 
ADD CONSTRAINT fk_bookings_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT fk_bookings_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Add foreign key constraints for reviews table
ALTER TABLE public.reviews 
ADD CONSTRAINT fk_reviews_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews 
ADD CONSTRAINT fk_reviews_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.reviews 
ADD CONSTRAINT fk_reviews_service_id 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.reviews 
ADD CONSTRAINT fk_reviews_booking_id 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Add foreign key constraints for service_requests table
ALTER TABLE public.service_requests 
ADD CONSTRAINT fk_service_requests_provider_id 
FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests 
ADD CONSTRAINT fk_service_requests_organizer_id 
FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests 
ADD CONSTRAINT fk_service_requests_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests 
ADD CONSTRAINT fk_service_requests_service_id 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- Add foreign key constraints for profiles table
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for user_roles table
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for user_wallets table
ALTER TABLE public.user_wallets 
ADD CONSTRAINT fk_user_wallets_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for wallet_transactions table
ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT fk_wallet_transactions_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for loyalty_ledger table
ALTER TABLE public.loyalty_ledger 
ADD CONSTRAINT fk_loyalty_ledger_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for notifications table
ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for notification_preferences table
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT fk_notification_preferences_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for refunds table
ALTER TABLE public.refunds 
ADD CONSTRAINT fk_refunds_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.refunds 
ADD CONSTRAINT fk_refunds_booking_id 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Add foreign key constraints for payments table
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_booking_id 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Add foreign key constraints for tickets table
ALTER TABLE public.tickets 
ADD CONSTRAINT fk_tickets_booking_id 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Add foreign key constraints for event_groups table
ALTER TABLE public.event_groups 
ADD CONSTRAINT fk_event_groups_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_groups 
ADD CONSTRAINT fk_event_groups_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for group_members table
ALTER TABLE public.group_members 
ADD CONSTRAINT fk_group_members_group_id 
FOREIGN KEY (group_id) REFERENCES public.event_groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_members 
ADD CONSTRAINT fk_group_members_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints for group_messages table
ALTER TABLE public.group_messages 
ADD CONSTRAINT fk_group_messages_group_id 
FOREIGN KEY (group_id) REFERENCES public.event_groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_messages 
ADD CONSTRAINT fk_group_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;