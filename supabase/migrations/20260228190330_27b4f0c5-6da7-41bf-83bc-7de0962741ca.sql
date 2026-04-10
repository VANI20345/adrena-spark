
-- Add columns to referral_rewards to support LP code redemptions
ALTER TABLE public.referral_rewards 
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'friend_referral',
  ADD COLUMN IF NOT EXISTS reward_details jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS code_used text DEFAULT NULL;

-- Make referrer_id nullable for LP codes (no referrer)
ALTER TABLE public.referral_rewards ALTER COLUMN referrer_id DROP NOT NULL;

-- Update the redeem_referral_code function to add notifications and reward history
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_clean_code text;
  v_is_lp boolean;
  v_form_row record;
  v_referrer_row record;
  v_badge_id uuid := '694b5c39-7704-41b2-b1b4-21ddf8d1d138';
  v_existing_badge boolean;
  v_current_ref uuid;
  v_user_name text;
  v_referrer_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  -- Get user name for notifications
  SELECT full_name INTO v_user_name FROM profiles WHERE user_id = v_user_id;

  -- Determine type by prefix
  v_is_lp := upper(p_code) LIKE 'LP-%';
  v_clean_code := CASE WHEN v_is_lp THEN substring(upper(p_code) from 4) ELSE upper(p_code) END;

  IF v_is_lp THEN
    -- Landing page flow
    SELECT * INTO v_form_row FROM form_submissions 
    WHERE referral_code = v_clean_code OR referral_code = 'LP-' || v_clean_code
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_code');
    END IF;
    IF v_form_row.referral_used THEN
      RETURN jsonb_build_object('ok', false, 'code', 'already_used');
    END IF;

    SELECT EXISTS(SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = v_badge_id) INTO v_existing_badge;
    IF v_existing_badge THEN
      RETURN jsonb_build_object('ok', false, 'code', 'already_redeemed');
    END IF;

    -- Award 1000 points
    INSERT INTO loyalty_ledger (user_id, type, points, description)
    VALUES (v_user_id, 'earned', 1000, 'Landing page referral reward');

    -- Award Beta Shield badge
    INSERT INTO user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id);

    -- Mark as shield member
    UPDATE user_gamification SET is_shield_member = true WHERE user_id = v_user_id;

    -- Mark code as used
    UPDATE form_submissions SET referral_used = true WHERE id = v_form_row.id;

    -- Save reward history
    INSERT INTO referral_rewards (referrer_id, referred_id, reward_status, reward_amount, credited_at, reward_type, reward_details, code_used)
    VALUES (NULL, v_user_id, 'credited', 1000, now(), 'landing_page', 
            jsonb_build_object('points', 1000, 'badge', 'Beta Shield', 'shield_member', true), 
            upper(p_code));

    -- Send notification to claimer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (v_user_id, 'referral_reward', 
            'مكافأة الإحالة! 🎉 / Referral Reward!',
            'حصلت على 1000 نقطة ولقب Beta Shield! / You earned 1000 points and the Beta Shield badge!',
            jsonb_build_object('reward_type', 'landing_page', 'points', 1000, 'badge', 'Beta Shield', 'code', upper(p_code)));

    RETURN jsonb_build_object('ok', true, 'code', 'lp_redeemed', 'rewards', jsonb_build_object('points', 1000, 'badge', 'Beta Shield', 'shield_member', true));
  ELSE
    -- Friend referral flow
    SELECT * INTO v_referrer_row FROM user_gamification WHERE referral_code = v_clean_code;
    
    IF NOT FOUND THEN
      -- Fallback: check form_submissions for raw LP codes
      SELECT * INTO v_form_row FROM form_submissions 
      WHERE referral_code = v_clean_code OR referral_code = 'LP-' || v_clean_code
      LIMIT 1;
      
      IF FOUND THEN
        IF v_form_row.referral_used THEN
          RETURN jsonb_build_object('ok', false, 'code', 'already_used');
        END IF;

        SELECT EXISTS(SELECT 1 FROM user_badges WHERE user_id = v_user_id AND badge_id = v_badge_id) INTO v_existing_badge;
        IF v_existing_badge THEN
          RETURN jsonb_build_object('ok', false, 'code', 'already_redeemed');
        END IF;

        INSERT INTO loyalty_ledger (user_id, type, points, description)
        VALUES (v_user_id, 'earned', 1000, 'Landing page referral reward');

        INSERT INTO user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id);
        UPDATE user_gamification SET is_shield_member = true WHERE user_id = v_user_id;
        UPDATE form_submissions SET referral_used = true WHERE id = v_form_row.id;

        -- Save reward history
        INSERT INTO referral_rewards (referrer_id, referred_id, reward_status, reward_amount, credited_at, reward_type, reward_details, code_used)
        VALUES (NULL, v_user_id, 'credited', 1000, now(), 'landing_page', 
                jsonb_build_object('points', 1000, 'badge', 'Beta Shield', 'shield_member', true), 
                v_clean_code);

        -- Send notification to claimer
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (v_user_id, 'referral_reward', 
                'مكافأة الإحالة! 🎉 / Referral Reward!',
                'حصلت على 1000 نقطة ولقب Beta Shield! / You earned 1000 points and the Beta Shield badge!',
                jsonb_build_object('reward_type', 'landing_page', 'points', 1000, 'badge', 'Beta Shield', 'code', v_clean_code));

        RETURN jsonb_build_object('ok', true, 'code', 'lp_redeemed', 'rewards', jsonb_build_object('points', 1000, 'badge', 'Beta Shield', 'shield_member', true));
      END IF;
      
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_code');
    END IF;
    
    IF v_referrer_row.user_id = v_user_id THEN
      RETURN jsonb_build_object('ok', false, 'code', 'self_referral');
    END IF;

    SELECT referred_by INTO v_current_ref FROM user_gamification WHERE user_id = v_user_id;
    IF v_current_ref IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'already_referred');
    END IF;

    UPDATE user_gamification SET referred_by = v_referrer_row.user_id WHERE user_id = v_user_id;

    -- Save reward history (pending until first paid booking)
    INSERT INTO referral_rewards (referrer_id, referred_id, reward_status, reward_type, reward_details, code_used)
    VALUES (v_referrer_row.user_id, v_user_id, 'pending', 'friend_referral',
            jsonb_build_object('status', 'pending_first_booking'),
            v_clean_code);

    -- Get referrer name
    SELECT full_name INTO v_referrer_name FROM profiles WHERE user_id = v_referrer_row.user_id;

    -- Notification to the referred user (claimer)
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (v_user_id, 'referral_applied', 
            'تم ربط الإحالة! / Referral Linked!',
            'تم ربط حسابك بدعوة ' || COALESCE(v_referrer_name, 'صديق') || ' / Your account is linked to ' || COALESCE(v_referrer_name, 'a friend') || '''s referral',
            jsonb_build_object('reward_type', 'friend_referral', 'referrer_id', v_referrer_row.user_id, 'referrer_name', v_referrer_name, 'code', v_clean_code));

    -- Notification to the referrer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (v_referrer_row.user_id, 'referral_used', 
            'تم استخدام كود الإحالة! 🎉 / Your Referral Code Was Used!',
            COALESCE(v_user_name, 'مستخدم جديد') || ' انضم بكود الإحالة الخاص بك / ' || COALESCE(v_user_name, 'A new user') || ' joined using your referral code',
            jsonb_build_object('reward_type', 'friend_referral', 'referred_id', v_user_id, 'referred_name', v_user_name, 'code', v_clean_code));

    RETURN jsonb_build_object('ok', true, 'code', 'friend_referred', 'referrer_id', v_referrer_row.user_id);
  END IF;
END;
$function$;
