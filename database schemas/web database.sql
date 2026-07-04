-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  display_id text NOT NULL UNIQUE,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  birth_date date,
  gender text,
  interests ARRAY,
  last_activity timestamp with time zone DEFAULT now(),
  warning_count integer DEFAULT 0,
  vat_number text,
  profile_visibility text NOT NULL DEFAULT 'public'::text CHECK (profile_visibility = ANY (ARRAY['public'::text, 'friends_only'::text, 'private'::text])),
  activity_visibility text NOT NULL DEFAULT 'followers'::text CHECK (activity_visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])),
  allow_friend_requests boolean NOT NULL DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'attendee'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  icon_name text,
  color_start text,
  color_end text,
  event_count integer DEFAULT 0,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  title text NOT NULL,
  title_ar text NOT NULL,
  description text,
  description_ar text,
  category_id uuid,
  location text NOT NULL,
  location_ar text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  price numeric DEFAULT 0,
  points_required integer DEFAULT 0,
  image_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  requires_license boolean DEFAULT false,
  license_document_url text,
  difficulty_level text CHECK (difficulty_level = ANY (ARRAY['easy'::text, 'moderate'::text, 'hard'::text, 'extreme'::text])),
  cancellation_policy text DEFAULT 'standard'::text,
  group_id uuid,
  detail_images ARRAY DEFAULT '{}'::text[],
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES auth.users(id),
  CONSTRAINT fk_events_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth.users(id),
  CONSTRAINT fk_events_category_id FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT events_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  category_id uuid,
  price numeric NOT NULL,
  duration_minutes integer,
  location text,
  location_ar text,
  image_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'inactive'::text])),
  featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  service_type text CHECK (service_type = ANY (ARRAY['discount'::text, 'training'::text, 'other'::text])),
  original_price numeric,
  discount_percentage integer CHECK (discount_percentage >= 1 AND discount_percentage <= 99),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  max_capacity integer,
  current_capacity integer DEFAULT 0,
  trainer_name text,
  training_level text CHECK (training_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  number_of_sets integer,
  duration_per_set integer,
  is_free boolean DEFAULT false,
  city_id uuid,
  thumbnail_url text,
  detail_images ARRAY,
  provided_services ARRAY,
  availability_type text DEFAULT 'full_day'::text,
  available_from time without time zone DEFAULT '08:00:00'::time without time zone,
  available_to time without time zone DEFAULT '22:00:00'::time without time zone,
  booking_duration_minutes integer DEFAULT 60,
  weekly_schedule jsonb DEFAULT '{}'::jsonb,
  available_forever boolean DEFAULT false,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES auth.users(id),
  CONSTRAINT services_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT fk_services_provider_id FOREIGN KEY (provider_id) REFERENCES auth.users(id),
  CONSTRAINT fk_services_provider FOREIGN KEY (provider_id) REFERENCES public.profiles(user_id),
  CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL CHECK (total_amount > 0::numeric),
  discount_amount numeric DEFAULT 0,
  points_used integer DEFAULT 0,
  vat_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'pending_payment'::text, 'confirmed'::text, 'cancelled'::text, 'refunded'::text, 'expired'::text, 'paid'::text, 'completed'::text])),
  payment_id text,
  booking_reference text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  commission_rate numeric DEFAULT 0,
  platform_commission numeric DEFAULT 0,
  provider_earnings numeric DEFAULT 0,
  vat_on_commission numeric DEFAULT 0,
  reservation_expires_at timestamp with time zone,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_bookings_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_bookings_event_id FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  ticket_number text NOT NULL UNIQUE,
  qr_code text NOT NULL UNIQUE,
  holder_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'cancelled'::text])),
  checked_in_at timestamp with time zone,
  checked_in_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  checked_in_location text,
  check_in_method text DEFAULT 'qr_code'::text,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT tickets_checked_in_by_fkey FOREIGN KEY (checked_in_by) REFERENCES auth.users(id),
  CONSTRAINT fk_tickets_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  sms_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid,
  service_id uuid,
  booking_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT fk_reviews_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_reviews_event_id FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT fk_reviews_service_id FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT fk_reviews_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR'::text,
  payment_method text NOT NULL,
  payment_provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'expired'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_payments_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text, 'commission'::text, 'refund'::text, 'withdrawal'::text])),
  amount numeric NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  reference_type text,
  status text NOT NULL DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_wallet_transactions_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.loyalty_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['earned'::text, 'redeemed'::text, 'expired'::text])),
  description text NOT NULL,
  reference_id uuid,
  reference_type text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_loyalty_ledger_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  group_name text NOT NULL,
  group_link text,
  group_id_external text,
  max_members integer DEFAULT 500,
  current_members integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  auto_delete_at timestamp with time zone,
  assigned_admin_id uuid,
  city_id uuid,
  category_id uuid,
  image_url text,
  description text,
  description_ar text,
  visibility text NOT NULL DEFAULT 'public'::text CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  requires_approval boolean NOT NULL DEFAULT false,
  equipment ARRAY DEFAULT '{}'::text[],
  min_age integer,
  max_age integer,
  gender_restriction text CHECK (gender_restriction = ANY (ARRAY['all'::text, 'male'::text, 'female'::text])),
  location_restriction uuid,
  join_mode text DEFAULT 'public'::text,
  admission_questions jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT event_groups_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id),
  CONSTRAINT event_groups_assigned_admin_id_fkey FOREIGN KEY (assigned_admin_id) REFERENCES public.profiles(user_id),
  CONSTRAINT event_groups_location_restriction_fkey FOREIGN KEY (location_restriction) REFERENCES public.cities(id),
  CONSTRAINT event_groups_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT event_groups_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  service_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  requested_price numeric,
  negotiated_price numeric,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])),
  message text,
  response_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_requests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_service_requests_provider_id FOREIGN KEY (provider_id) REFERENCES auth.users(id),
  CONSTRAINT fk_service_requests_organizer_id FOREIGN KEY (organizer_id) REFERENCES auth.users(id),
  CONSTRAINT fk_service_requests_event_id FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT fk_service_requests_service_id FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['requested'::text, 'pending'::text, 'processing'::text, 'approved'::text, 'completed'::text, 'rejected'::text, 'manual_review'::text, 'failed'::text])),
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  refund_type text NOT NULL DEFAULT 'automatic'::text CHECK (refund_type = ANY (ARRAY['automatic'::text, 'manual'::text, 'partial'::text, 'full'::text])),
  booking_type text NOT NULL DEFAULT 'event'::text CHECK (booking_type = ANY (ARRAY['event'::text, 'service'::text])),
  eligible_pct numeric NOT NULL DEFAULT 0,
  eligible_amount numeric NOT NULL DEFAULT 0,
  payment_hold_id uuid,
  failure_reason text,
  admin_notes text,
  auto_processed boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refunds_pkey PRIMARY KEY (id),
  CONSTRAINT refunds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id),
  CONSTRAINT fk_refunds_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_refunds_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT refunds_payment_hold_id_fkey FOREIGN KEY (payment_hold_id) REFERENCES public.payment_holds(id)
);
CREATE TABLE public.user_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0::numeric),
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  pending_earnings numeric DEFAULT 0,
  total_service_revenue numeric DEFAULT 0,
  held_balance numeric NOT NULL DEFAULT 0 CHECK (held_balance >= 0::numeric),
  CONSTRAINT user_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_user_wallets_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT true,
  booking_confirmations boolean NOT NULL DEFAULT true,
  event_reminders boolean NOT NULL DEFAULT true,
  event_updates boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  follower_activity boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_notification_preferences_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.group_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_group_messages_sender_id FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT group_chat_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_muted boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'moderator'::text, 'admin'::text, 'member'::text])),
  CONSTRAINT group_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id),
  CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  region text,
  region_ar text,
  latitude numeric,
  longitude numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  stat_value_ar text NOT NULL,
  stat_value_en text NOT NULL,
  description_ar text,
  description_en text,
  icon_name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_statistics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rating_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['event'::text, 'service'::text])),
  average_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  rating_1 integer DEFAULT 0,
  rating_2 integer DEFAULT 0,
  rating_3 integer DEFAULT 0,
  rating_4 integer DEFAULT 0,
  rating_5 integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rating_summaries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  booking_date timestamp with time zone NOT NULL,
  service_date timestamp with time zone NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount > 0::numeric),
  status text NOT NULL DEFAULT 'pending'::text,
  payment_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  special_requests text,
  booking_reference text NOT NULL DEFAULT concat('SB', (EXTRACT(epoch FROM now()))::text),
  start_time time without time zone,
  end_time time without time zone,
  quantity integer NOT NULL DEFAULT 1,
  commission_rate numeric DEFAULT 0,
  platform_commission numeric DEFAULT 0,
  provider_earnings numeric DEFAULT 0,
  vat_on_commission numeric DEFAULT 0,
  is_discounted boolean DEFAULT false,
  CONSTRAINT service_bookings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_type text DEFAULT 'event'::text,
  CONSTRAINT bookmarks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  value numeric NOT NULL CHECK (value > 0::numeric),
  description text,
  description_ar text,
  min_amount numeric DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  event_specific uuid,
  user_specific uuid,
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_event_specific_fkey FOREIGN KEY (event_specific) REFERENCES public.events(id)
);
CREATE TABLE public.service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  parent_id uuid,
  icon_name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_categories_pkey PRIMARY KEY (id),
  CONSTRAINT service_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.service_categories(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level = ANY (ARRAY['INFO'::text, 'WARNING'::text, 'ERROR'::text, 'CRITICAL'::text])),
  message text NOT NULL,
  details jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id),
  CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
  CONSTRAINT fk_admin_activity_logs_admin FOREIGN KEY (admin_id) REFERENCES public.profiles(user_id)
);
CREATE TABLE public.admin_group_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL UNIQUE,
  group_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_group_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT admin_group_assignments_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.group_message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  file_size integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT group_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.group_chat_messages(id)
);
CREATE TABLE public.contact_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  CONSTRAINT contact_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT contact_submissions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  CONSTRAINT user_reports_pkey PRIMARY KEY (id),
  CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT user_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES auth.users(id),
  CONSTRAINT user_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);
CREATE TABLE public.reported_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY['group'::text, 'friend_group'::text, 'direct'::text])),
  reported_by uuid NOT NULL,
  reason text NOT NULL,
  additional_details text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_notes text,
  message_content text NOT NULL,
  sender_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reported_messages_pkey PRIMARY KEY (id),
  CONSTRAINT reported_messages_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id),
  CONSTRAINT reported_messages_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id),
  CONSTRAINT reported_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.interest_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interest_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  media_urls ARRAY,
  media_type text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'mixed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  post_type text DEFAULT 'text'::text,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.post_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  parent_id uuid,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id)
);
CREATE TABLE public.leaderboard_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type = ANY (ARRAY['weekly'::text, 'monthly'::text])),
  period_start date NOT NULL,
  period_end date NOT NULL,
  points integer NOT NULL DEFAULT 0,
  events_attended integer DEFAULT 0,
  groups_joined integer DEFAULT 0,
  posts_created integer DEFAULT 0,
  rank integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.group_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  interest_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_interests_pkey PRIMARY KEY (id),
  CONSTRAINT group_interests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_interests_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.interest_categories(id)
);
CREATE TABLE public.group_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  admission_answers jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT group_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT group_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  option_text text NOT NULL,
  option_order integer NOT NULL DEFAULT 0,
  votes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT poll_options_pkey PRIMARY KEY (id),
  CONSTRAINT poll_options_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id)
);
CREATE TABLE public.pricing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  plan_name text,
  plan_name_ar text,
  price numeric NOT NULL DEFAULT 0,
  ticket_limit integer NOT NULL DEFAULT 10,
  available_tickets integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pricing_plans_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_plans_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  schedule_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  day_description text,
  CONSTRAINT event_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT event_schedules_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  interest_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_interests_pkey PRIMARY KEY (id),
  CONSTRAINT event_interests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_interests_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.categories(id)
);
CREATE TABLE public.training_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid,
  set_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  available_spots integer NOT NULL,
  booked_spots integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_sets_pkey PRIMARY KEY (id),
  CONSTRAINT training_sets_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id),
  CONSTRAINT user_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_warnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  reason text NOT NULL,
  content text NOT NULL,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_warnings_pkey PRIMARY KEY (id),
  CONSTRAINT user_warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_data jsonb DEFAULT '{}'::jsonb,
  visibility text DEFAULT 'followers'::text CHECK (visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.follow_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT follow_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone,
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT direct_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  icon_name text,
  badge_type text NOT NULL DEFAULT 'achievement'::text,
  requirement_type text,
  requirement_value integer DEFAULT 1,
  points_reward integer DEFAULT 0,
  is_active boolean DEFAULT true,
  rarity text DEFAULT 'common'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id)
);
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid,
  referred_id uuid NOT NULL,
  booking_id uuid,
  reward_amount numeric DEFAULT 10,
  reward_status text DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  credited_at timestamp with time zone,
  reward_type text NOT NULL DEFAULT 'friend_referral'::text,
  reward_details jsonb,
  code_used text,
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  target_user_id uuid,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT support_tickets_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_admin_reply boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profile_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT profile_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.provider_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'resubmit'::text])),
  id_document_url text,
  license_url text,
  commercial_registration_url text,
  service_types ARRAY,
  verified_at timestamp with time zone,
  verified_by uuid,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT provider_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT provider_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_suspensions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  suspended_at timestamp with time zone DEFAULT now(),
  suspended_until timestamp with time zone,
  suspended_by uuid,
  lifted_at timestamp with time zone,
  lifted_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_suspensions_pkey PRIMARY KEY (id),
  CONSTRAINT user_suspensions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_suspensions_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id),
  CONSTRAINT user_suspensions_lifted_by_fkey FOREIGN KEY (lifted_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_gamification (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  points_balance integer DEFAULT 0,
  total_points_earned integer DEFAULT 0,
  referral_code text UNIQUE,
  referral_count integer DEFAULT 0,
  referred_by uuid,
  is_shield_member boolean DEFAULT false,
  auto_redeem_points boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_gamification_pkey PRIMARY KEY (id),
  CONSTRAINT user_gamification_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_gamification_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_privacy_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_visibility text DEFAULT 'public'::text CHECK (profile_visibility = ANY (ARRAY['public'::text, 'private'::text, 'followers'::text])),
  interests_visibility text DEFAULT 'public'::text,
  activity_visibility text DEFAULT 'public'::text,
  allow_friend_requests boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_privacy_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_privacy_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.training_service_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL UNIQUE,
  trainer_name text,
  training_level text,
  duration_minutes integer,
  max_capacity integer,
  number_of_sets integer,
  duration_per_set integer,
  provided_services ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_service_details_pkey PRIMARY KEY (id),
  CONSTRAINT training_service_details_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.discount_service_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL UNIQUE,
  original_price numeric NOT NULL,
  discount_percentage integer,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discount_service_details_pkey PRIMARY KEY (id),
  CONSTRAINT discount_service_details_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.service_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  availability_type text,
  available_from time without time zone,
  available_to time without time zone,
  booking_duration_minutes integer,
  weekly_schedule jsonb,
  available_forever boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT service_schedules_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_data jsonb,
  visibility text DEFAULT 'followers'::text,
  is_admin_action boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.entity_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  additional_details text,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entity_reports_pkey PRIMARY KEY (id)
);
CREATE TABLE public.group_join_request_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['submitted'::text, 'resubmitted'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'left_group'::text])),
  message text,
  admission_answers jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_join_request_history_pkey PRIMARY KEY (id),
  CONSTRAINT group_join_request_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.group_join_requests(id),
  CONSTRAINT group_join_request_history_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_join_request_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.admin_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role USER-DEFINED NOT NULL,
  permission_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.super_admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT super_admin_activity_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_performance_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  events_approved integer DEFAULT 0,
  events_rejected integer DEFAULT 0,
  services_approved integer DEFAULT 0,
  services_rejected integer DEFAULT 0,
  providers_approved integer DEFAULT 0,
  providers_rejected integer DEFAULT 0,
  tickets_resolved integer DEFAULT 0,
  reports_handled integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_performance_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.financial_transaction_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['booking_payment'::text, 'hold_created'::text, 'hold_not_required'::text, 'hold_ready_for_review'::text, 'hold_released'::text, 'dispute_opened'::text, 'dispute_closed'::text, 'refund_requested'::text, 'refund_approved'::text, 'withdrawal_requested'::text, 'withdrawal_completed'::text, 'withdrawal_rejected'::text])),
  amount numeric NOT NULL,
  commission_amount numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  reference_type text,
  reference_id uuid,
  payer_id uuid,
  receiver_id uuid,
  status text DEFAULT 'completed'::text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  invoice_id uuid,
  service_type text,
  CONSTRAINT financial_transaction_logs_pkey PRIMARY KEY (id),
  CONSTRAINT financial_transaction_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.platform_invoices(id)
);
CREATE TABLE public.platform_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  invoice_type text NOT NULL DEFAULT 'simplified'::text,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  provider_name text,
  provider_vat_number text,
  platform_name text DEFAULT 'Hiwayaa'::text,
  platform_vat_number text,
  gross_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  vat_on_commission numeric NOT NULL,
  net_commission numeric NOT NULL,
  provider_net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  zatca_invoice_hash text,
  zatca_qr_code text,
  zatca_submission_id text,
  zatca_clearance_status text,
  zatca_submitted_at timestamp with time zone,
  zatca_response jsonb,
  invoice_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  invoice_audience text DEFAULT 'provider'::text CHECK (invoice_audience = ANY (ARRAY['customer'::text, 'provider'::text])),
  customer_id uuid,
  customer_name text,
  customer_vat_number text,
  total_vat_amount numeric DEFAULT 0,
  CONSTRAINT platform_invoices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  favorite_hobbies ARRAY NOT NULL,
  enjoy_more_story text,
  desired_hobbies ARRAY NOT NULL,
  dream_experience_story text,
  referral_code text NOT NULL DEFAULT upper(SUBSTRING(md5(((random())::text || (clock_timestamp())::text)) FROM 1 FOR 8)),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text UNIQUE,
  phone text UNIQUE,
  referral_used boolean NOT NULL DEFAULT false,
  CONSTRAINT form_submissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_holds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_type USER-DEFINED NOT NULL,
  source_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  payer_id uuid NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR'::text,
  status USER-DEFINED NOT NULL DEFAULT 'held'::payment_hold_status,
  event_end_at timestamp with time zone,
  hold_until timestamp with time zone NOT NULL,
  released_at timestamp with time zone,
  released_by uuid,
  complaint_extension boolean NOT NULL DEFAULT false,
  complaint_reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  available_amount numeric DEFAULT 0,
  held_amount numeric DEFAULT 0,
  booking_table text,
  auto_split_percent integer DEFAULT 70,
  review_state USER-DEFINED NOT NULL DEFAULT 'pending'::hold_review_state,
  CONSTRAINT payment_holds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 100::numeric),
  currency text NOT NULL DEFAULT 'SAR'::text,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  account_number text NOT NULL,
  iban text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::withdrawal_status,
  reference_number text NOT NULL UNIQUE,
  wallet_transaction_id uuid,
  admin_notes text,
  rejection_reason text,
  external_transfer_ref text,
  processed_by uuid,
  processed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'error'::text CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])),
  component text NOT NULL,
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  reference_type text,
  reference_id uuid,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_alerts_pkey PRIMARY KEY (id)
);