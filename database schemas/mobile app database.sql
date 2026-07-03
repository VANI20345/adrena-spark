-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.admin_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role USER-DEFINED NOT NULL,
  permission_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_permissions_pkey PRIMARY KEY (id)
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
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_type text DEFAULT 'event'::text,
  CONSTRAINT bookmarks_pkey PRIMARY KEY (id)
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
CREATE TABLE public.coaches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_name character varying NOT NULL,
  image_url text,
  job_title character varying,
  CONSTRAINT coaches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  amount integer NOT NULL,
  source_type character varying NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coin_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_coin_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
);
CREATE TABLE public.comment_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.post_comments(id),
  CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id),
  CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
CREATE TABLE public.email_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.entity_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type character varying NOT NULL,
  entity_id uuid NOT NULL,
  media_id uuid NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  CONSTRAINT entity_media_pkey PRIMARY KEY (id),
  CONSTRAINT entity_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id)
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
CREATE TABLE public.equipments (
  equipment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name_ar character varying NOT NULL,
  name_en character varying NOT NULL,
  CONSTRAINT equipments_pkey PRIMARY KEY (equipment_id)
);
CREATE TABLE public.event_days (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  schedule_date date,
  scheduled_datetime timestamp with time zone,
  start_time time without time zone,
  end_time time without time zone,
  day_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_days_pkey PRIMARY KEY (id),
  CONSTRAINT event_days_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
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
CREATE TABLE public.event_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  price numeric CHECK (price >= 0::numeric),
  members_count integer CHECK (members_count > 0),
  CONSTRAINT event_plans_pkey PRIMARY KEY (id),
  CONSTRAINT event_plans_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_tags (
  event_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id),
  CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  group_id uuid,
  title character varying NOT NULL,
  description text,
  location character varying,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  max_attendees integer CHECK (max_attendees > 0),
  current_attendees integer NOT NULL DEFAULT 0 CHECK (current_attendees >= 0),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::event_status,
  average_rating numeric NOT NULL DEFAULT 0 CHECK (average_rating >= 0::numeric AND average_rating <= 5::numeric),
  review_count integer NOT NULL DEFAULT 0,
  city_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id),
  CONSTRAINT events_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT events_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.financial_transaction_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['booking_payment'::text, 'hold_created'::text, 'hold_ready_for_review'::text, 'hold_released'::text, 'dispute_opened'::text, 'dispute_closed'::text, 'refund_requested'::text, 'refund_approved'::text, 'withdrawal_requested'::text, 'withdrawal_completed'::text, 'withdrawal_rejected'::text])),
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
CREATE TABLE public.followers (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT followers_pkey PRIMARY KEY (follower_id, following_id),
  CONSTRAINT followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id),
  CONSTRAINT followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id)
);
CREATE TABLE public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  favorite_hobbies ARRAY NOT NULL DEFAULT '{}'::text[],
  enjoy_more_story text,
  desired_hobbies ARRAY NOT NULL DEFAULT '{}'::text[],
  dream_experience_story text,
  referral_code text NOT NULL DEFAULT upper(SUBSTRING(md5(((random())::text || (clock_timestamp())::text)) FROM 1 FOR 8)),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text UNIQUE,
  phone text UNIQUE,
  referral_used boolean NOT NULL DEFAULT false,
  CONSTRAINT form_submissions_pkey PRIMARY KEY (id)
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
CREATE TABLE public.group_equipments (
  group_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_equipments_pkey PRIMARY KEY (group_id, equipment_id),
  CONSTRAINT group_equipments_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipments(equipment_id),
  CONSTRAINT group_equipments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_hobbies (
  group_id uuid NOT NULL,
  hobby_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_hobbies_pkey PRIMARY KEY (group_id, hobby_id),
  CONSTRAINT group_hobbies_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_hobbies_hobby_id_fkey FOREIGN KEY (hobby_id) REFERENCES public.hobbies(hobby_id)
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
CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  role USER-DEFINED NOT NULL DEFAULT 'member'::group_role,
  left_at timestamp with time zone,
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
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
CREATE TABLE public.group_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  activity_type character varying NOT NULL DEFAULT 'post'::character varying,
  reference_id uuid,
  CONSTRAINT group_points_pkey PRIMARY KEY (id),
  CONSTRAINT group_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT group_points_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::request_status,
  rejected_reason text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid,
  admission_answers jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT group_requests_pkey PRIMARY KEY (id),
  CONSTRAINT group_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT group_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.group_tags (
  group_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_tags_pkey PRIMARY KEY (group_id, tag_id),
  CONSTRAINT group_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id),
  CONSTRAINT group_tags_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  description text,
  description_ar text,
  min_age smallint CHECK (min_age > 0),
  max_age smallint CHECK (max_age > 0),
  visibility USER-DEFINED NOT NULL DEFAULT 'public'::visibility_type,
  created_by uuid NOT NULL,
  city_id uuid,
  max_members integer DEFAULT 500,
  current_members integer NOT NULL DEFAULT 0,
  gender_restriction text,
  admission_questions jsonb DEFAULT '[]'::jsonb,
  join_policy USER-DEFINED NOT NULL DEFAULT 'open'::join_policy_type,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  first_date timestamp with time zone,
  end_date timestamp with time zone,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT groups_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.hobbies (
  hobby_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_ar character varying NOT NULL,
  name_en character varying NOT NULL,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hobbies_pkey PRIMARY KEY (hobby_id)
);
CREATE TABLE public.home_carousel_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  aspect_ratio numeric NOT NULL DEFAULT 1.7778,
  link_kind text NOT NULL DEFAULT 'none'::text CHECK (link_kind = ANY (ARRAY['none'::text, 'external'::text, 'deep_link'::text])),
  external_url text,
  deep_link_segment text,
  entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT home_carousel_slides_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interest_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interest_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_url text NOT NULL,
  thumbnail_url text NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  media_type text NOT NULL DEFAULT 'image'::text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text])),
  CONSTRAINT media_pkey PRIMARY KEY (id),
  CONSTRAINT media_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id)
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
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title jsonb,
  subject USER-DEFINED NOT NULL,
  description jsonb,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  topic text,
  related_entity_id uuid,
  related_entity_type text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR'::text,
  payment_method text NOT NULL,
  payment_provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_payments_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
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
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  reactions_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.post_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_views_pkey PRIMARY KEY (id),
  CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.post_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  content character varying NOT NULL,
  votes_count integer NOT NULL DEFAULT 0,
  group_id uuid,
  position integer NOT NULL,
  CONSTRAINT post_votes_pkey PRIMARY KEY (id),
  CONSTRAINT post_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_votes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  group_id uuid NOT NULL,
  post_type USER-DEFINED NOT NULL DEFAULT 'post_text'::post_type,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  poll_allow_multiple boolean NOT NULL DEFAULT true,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
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
CREATE TABLE public.provider_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_list jsonb,
  identity_doc_url text,
  commercial_reg_url text,
  license_doc_url text,
  verification_status USER-DEFINED NOT NULL DEFAULT 'pending'::verification_status,
  CONSTRAINT provider_documents_pkey PRIMARY KEY (id),
  CONSTRAINT provider_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referral_id uuid,
  referrer_id uuid,
  referred_id uuid NOT NULL,
  booking_id uuid,
  reward_type USER-DEFINED NOT NULL DEFAULT 'friend_referral'::referral_reward_type,
  reward_amount numeric DEFAULT 10,
  reward_status text DEFAULT 'pending'::text,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rewarded_at timestamp with time zone,
  credited_at timestamp with time zone,
  reward_details jsonb,
  code_used text,
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id),
  CONSTRAINT referral_rewards_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referral_rewards_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::referral_status,
  completed_at timestamp with time zone,
  rewarded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id),
  CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id)
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
  CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id),
  CONSTRAINT fk_refunds_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT refunds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT fk_refunds_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT refunds_payment_hold_id_fkey FOREIGN KEY (payment_hold_id) REFERENCES public.payment_holds(id)
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
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  report_type USER-DEFINED NOT NULL,
  reported_entity_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid,
  service_id uuid,
  reservation_id uuid,
  booking_id uuid,
  rating numeric NOT NULL CHECK (rating >= 1::numeric AND rating <= 5::numeric),
  comment text,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT reviews_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT reviews_service_booking_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.service_bookings(id)
);
CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id)
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
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  location character varying,
  start_date date,
  end_date date,
  total_reservations integer NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'active'::service_status,
  average_rating numeric NOT NULL DEFAULT 0 CHECK (average_rating >= 0::numeric AND average_rating <= 5::numeric),
  price numeric CHECK (price >= 0::numeric),
  max_members integer CHECK (max_members > 0),
  review_count integer NOT NULL DEFAULT 0,
  address text,
  discount_percentage smallint CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  service_type USER-DEFINED NOT NULL DEFAULT 'service'::service_type,
  city uuid,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id),
  CONSTRAINT fk_services_city FOREIGN KEY (city) REFERENCES public.cities(id)
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
CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  viewed_at timestamp with time zone,
  CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT support_ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  ticket_type USER-DEFINED NOT NULL,
  group_id uuid,
  service_id uuid,
  subject text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'open'::support_ticket_status,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT support_tickets_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT support_tickets_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
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
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trainings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  category character varying,
  level USER-DEFINED NOT NULL,
  max_seats integer CHECK (max_seats > 0),
  CONSTRAINT trainings_pkey PRIMARY KEY (id),
  CONSTRAINT trainings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT trainings_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::transaction_status,
  amount numeric NOT NULL CHECK (amount <> 0::numeric),
  description text,
  reference_id uuid,
  reference_type character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
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
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id)
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
CREATE TABLE public.user_hobbies (
  user_id uuid NOT NULL,
  hobby_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_hobbies_pkey PRIMARY KEY (user_id, hobby_id),
  CONSTRAINT user_hobbies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_hobbies_hobby_id_fkey FOREIGN KEY (hobby_id) REFERENCES public.hobbies(hobby_id)
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
CREATE TABLE public.user_profile_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  visibility USER-DEFINED NOT NULL DEFAULT 'public'::visibility_type,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profile_photos_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
CREATE TABLE public.user_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT user_votes_pkey PRIMARY KEY (id),
  CONSTRAINT user_votes_vote_id_fkey FOREIGN KEY (vote_id) REFERENCES public.post_votes(id),
  CONSTRAINT user_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
CREATE TABLE public.users (
  id uuid NOT NULL,
  username character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying,
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  birth_date date,
  gender USER-DEFINED,
  profile_image_url text,
  address text,
  preferences jsonb,
  points integer NOT NULL DEFAULT 0,
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  events_joined_count integer NOT NULL DEFAULT 0,
  referral_code character varying UNIQUE,
  referred_by uuid,
  referrals_count integer NOT NULL DEFAULT 0,
  is_groups_public boolean NOT NULL DEFAULT true,
  is_interests_public boolean NOT NULL DEFAULT true,
  is_followers_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  device_token text,
  city uuid,
  display_id text,
  bio text,
  last_activity timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  suspended boolean,
  suspension_reason text,
  suspended_at timestamp with time zone,
  suspended_until timestamp with time zone,
  suspended_by uuid,
  total_points_earned integer,
  is_shield_member boolean,
  auto_redeem_points boolean,
  profile_visibility text,
  interests_visibility text,
  activity_visibility text,
  allow_friend_requests boolean,
  warning_count integer,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id),
  CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id),
  CONSTRAINT fk_users_city FOREIGN KEY (city) REFERENCES public.cities(id)
);
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0 CHECK (available_balance >= 0::numeric),
  withdrawn_balance numeric NOT NULL DEFAULT 0 CHECK (withdrawn_balance >= 0::numeric),
  pending_balance numeric NOT NULL DEFAULT 0 CHECK (pending_balance >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  available_coins integer NOT NULL DEFAULT 0 CHECK (available_coins >= 0),
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.withdraw_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  bank_account_owner character varying NOT NULL,
  bank_name character varying NOT NULL,
  account_number character varying NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::withdraw_status,
  request_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  rejected_reason text,
  processed_at timestamp with time zone,
  processed_by uuid,
  CONSTRAINT withdraw_requests_pkey PRIMARY KEY (id),
  CONSTRAINT withdraw_requests_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id),
  CONSTRAINT withdraw_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id)
);
CREATE TABLE public.event_hobbies (
  event_id uuid NOT NULL,
  hobby_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_hobbies_pkey PRIMARY KEY (event_id, hobby_id),
  CONSTRAINT event_hobbies_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_hobbies_hobby_id_fkey FOREIGN KEY (hobby_id) REFERENCES public.hobbies(hobby_id)
);