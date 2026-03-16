-- ==========================================
-- 1. GAMIFICATION SYSTEM: Badges & Achievements
-- ==========================================

-- Badges definition table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  icon_name TEXT,
  badge_type TEXT NOT NULL DEFAULT 'achievement', -- 'achievement', 'milestone', 'special'
  requirement_type TEXT, -- 'booking_count', 'event_count', 'training_count', 'referral_count', etc
  requirement_value INTEGER DEFAULT 1,
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User badges (awarded badges)
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges policies
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (is_active = true);
CREATE POLICY "Only admins can manage badges" ON public.badges FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
);

-- User badges policies
CREATE POLICY "Users can view all user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON public.user_badges FOR INSERT WITH CHECK (true);

-- ==========================================
-- 2. SHIELD MEMBER (Beta Users)
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_shield_member BOOLEAN DEFAULT false;

-- ==========================================
-- 3. REFERRAL SYSTEM
-- ==========================================
-- Add referral code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Referral tracking table
CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID, -- The first paid booking that triggered the reward
  reward_amount NUMERIC DEFAULT 10,
  reward_status TEXT DEFAULT 'pending', -- 'pending', 'credited', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referral rewards" ON public.referral_rewards 
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-char alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code();

-- ==========================================
-- 4. ENHANCED GROUP JOIN WITH ADMISSION FORMS
-- ==========================================
-- Add join_mode to event_groups
ALTER TABLE public.event_groups ADD COLUMN IF NOT EXISTS join_mode TEXT DEFAULT 'public'; -- 'public', 'private', 'admission'
ALTER TABLE public.event_groups ADD COLUMN IF NOT EXISTS admission_questions JSONB DEFAULT '[]'::jsonb;

-- Add answers to join requests
ALTER TABLE public.group_join_requests ADD COLUMN IF NOT EXISTS admission_answers JSONB DEFAULT '[]'::jsonb;

-- ==========================================
-- 5. UNIFIED TICKET COMMUNICATION SYSTEM
-- ==========================================
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL, -- 'group_inquiry', 'training_inquiry', 'support'
  entity_type TEXT, -- 'group', 'service', 'event', null for support
  entity_id UUID,
  target_user_id UUID REFERENCES auth.users(id), -- Leader/Trainer for inquiries
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'replied', 'resolved', 'disputed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT one_open_per_entity UNIQUE NULLS NOT DISTINCT (user_id, entity_type, entity_id, status)
);

-- Ticket messages
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets policies
CREATE POLICY "Users can view their own tickets" ON public.support_tickets 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create tickets" ON public.support_tickets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update tickets" ON public.support_tickets 
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets 
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

-- Ticket messages policies
CREATE POLICY "Participants can view ticket messages" ON public.ticket_messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_messages.ticket_id 
      AND (user_id = auth.uid() OR target_user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages" ON public.ticket_messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_messages.ticket_id 
      AND (user_id = auth.uid() OR target_user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all messages" ON public.ticket_messages 
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

-- Trigger to update ticket timestamp
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 6. INSERT INITIAL BADGES
-- ==========================================
INSERT INTO public.badges (name, name_ar, description, description_ar, icon_name, badge_type, requirement_type, requirement_value, points_reward, rarity) VALUES
('First Adventure', 'المغامرة الأولى', 'Booked your first event', 'حجزت فعاليتك الأولى', 'Ticket', 'milestone', 'booking_count', 1, 50, 'common'),
('Explorer', 'المستكشف', 'Attended 5 events', 'حضرت 5 فعاليات', 'Compass', 'achievement', 'booking_count', 5, 100, 'common'),
('Adventurer', 'المغامر', 'Attended 10 events', 'حضرت 10 فعاليات', 'Mountain', 'achievement', 'booking_count', 10, 200, 'rare'),
('Training Beginner', 'متدرب مبتدئ', 'Enrolled in your first training', 'سجلت في أول تدريب', 'GraduationCap', 'milestone', 'training_count', 1, 50, 'common'),
('Training Master', 'أستاذ التدريب', 'Completed 5 trainings', 'أكملت 5 تدريبات', 'Award', 'achievement', 'training_count', 5, 200, 'rare'),
('Social Butterfly', 'الفراشة الاجتماعية', 'Joined 3 groups', 'انضممت لـ 3 مجموعات', 'Users', 'achievement', 'group_count', 3, 75, 'common'),
('Community Leader', 'قائد المجتمع', 'Created a group', 'أنشأت مجموعة', 'Crown', 'milestone', 'group_created', 1, 150, 'rare'),
('Influencer', 'المؤثر', 'Referred 5 friends', 'أحلت 5 أصدقاء', 'Share2', 'achievement', 'referral_count', 5, 250, 'epic'),
('The Shield', 'الدرع', 'One of our first 1000 beta users', 'من أوائل 1000 مستخدم', 'Shield', 'special', null, null, 500, 'legendary');

-- Generate referral codes for existing users
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;