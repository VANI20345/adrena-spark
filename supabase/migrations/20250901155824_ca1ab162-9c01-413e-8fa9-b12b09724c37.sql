-- Create tickets table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE TABLE public.tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL,
          ticket_number TEXT UNIQUE NOT NULL,
          qr_code TEXT UNIQUE NOT NULL,
          holder_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
          checked_in_at TIMESTAMP WITH TIME ZONE,
          checked_in_by UUID,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Create notifications table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE public.notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          read BOOLEAN NOT NULL DEFAULT false,
          email_sent BOOLEAN NOT NULL DEFAULT false,
          sms_sent BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Create reviews table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE public.reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          event_id UUID,
          service_id UUID,
          booking_id UUID,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          helpful_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT review_target_check CHECK (
            (event_id IS NOT NULL AND service_id IS NULL) OR 
            (event_id IS NULL AND service_id IS NOT NULL)
          )
        );
    END IF;
END
$$;

-- Create payments table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE TABLE public.payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency TEXT NOT NULL DEFAULT 'SAR',
          payment_method TEXT NOT NULL,
          payment_provider TEXT NOT NULL,
          provider_payment_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          completed_at TIMESTAMP WITH TIME ZONE
        );
    END IF;
END
$$;

-- Create wallet_transactions table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        CREATE TABLE public.wallet_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'commission', 'refund', 'withdrawal')),
          amount DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          reference_id UUID,
          reference_type TEXT,
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Create loyalty_ledger table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'loyalty_ledger') THEN
        CREATE TABLE public.loyalty_ledger (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          points INTEGER NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired')),
          description TEXT NOT NULL,
          reference_id UUID,
          reference_type TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Create user_wallets table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_wallets') THEN
        CREATE TABLE public.user_wallets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          balance DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Create notification_preferences table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        CREATE TABLE public.notification_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          email_notifications BOOLEAN NOT NULL DEFAULT true,
          sms_notifications BOOLEAN NOT NULL DEFAULT true,
          booking_confirmations BOOLEAN NOT NULL DEFAULT true,
          event_reminders BOOLEAN NOT NULL DEFAULT true,
          event_updates BOOLEAN NOT NULL DEFAULT true,
          marketing_emails BOOLEAN NOT NULL DEFAULT false,
          follower_activity BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END
$$;

-- Add columns to existing tables if they don't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS requires_license BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS license_document_url TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'hard', 'extreme')),
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'standard';

-- Add columns to profiles table if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_redeem_points BOOLEAN DEFAULT true;

-- Enable RLS on tables that need it
DO $$
DECLARE
    table_name TEXT;
    tables_to_secure TEXT[] := ARRAY['tickets', 'notifications', 'reviews', 'payments', 'wallet_transactions', 'loyalty_ledger', 'user_wallets', 'notification_preferences'];
BEGIN
    FOREACH table_name IN ARRAY tables_to_secure
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END
$$;