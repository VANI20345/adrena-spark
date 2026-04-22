CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_clean_code text;
  v_is_lp boolean;
  v_form_row record;
  v_referrer_row record;
  v_badge_id uuid := '694b5c39-7704-41b2-b1b4-21ddf8d1d138';
  v_existing_badge boolean;
  v_current_ref uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  -- Determine type by prefix
  v_is_lp := upper(p_code) LIKE 'LP-%';
  v_clean_code := CASE WHEN v_is_lp THEN substring(upper(p_code) from 4) ELSE upper(p_code) END;

  IF v_is_lp THEN
    -- Landing page flow
    SELECT * INTO v_form_row FROM form_submissions WHERE referral_code = v_clean_code;
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

    RETURN jsonb_build_object('ok', true, 'code', 'lp_redeemed', 'rewards', jsonb_build_object('points', 1000, 'badge', 'Beta Shield', 'shield_member', true));
  ELSE
    -- Friend referral flow
    SELECT * INTO v_referrer_row FROM user_gamification WHERE referral_code = v_clean_code;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_code');
    END IF;
    IF v_referrer_row.user_id = v_user_id THEN
      RETURN jsonb_build_object('ok', false, 'code', 'self_referral');
    END IF;

    -- Check if already referred
    SELECT referred_by INTO v_current_ref FROM user_gamification WHERE user_id = v_user_id;
    IF v_current_ref IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'already_referred');
    END IF;

    UPDATE user_gamification SET referred_by = v_referrer_row.user_id WHERE user_id = v_user_id;

    INSERT INTO referral_rewards (referrer_id, referred_id, reward_status)
    VALUES (v_referrer_row.user_id, v_user_id, 'pending');

    RETURN jsonb_build_object('ok', true, 'code', 'friend_referred', 'referrer_id', v_referrer_row.user_id);
  END IF;
END;
$$;