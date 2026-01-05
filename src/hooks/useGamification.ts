import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('rarity');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: ['user-badges', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges:badge_id(*)
        `)
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserReferralInfo() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-referral', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('referral_code, referral_count, is_shield_member')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      // Get referral rewards
      const { data: rewards } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      return {
        ...profile,
        rewards: rewards || [],
        totalEarned: (rewards || [])
          .filter(r => r.reward_status === 'credited')
          .reduce((sum, r) => sum + (r.reward_amount || 0), 0)
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProcessReferral() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (referralCode: string) => {
      // Find referrer by code
      const { data: referrer, error: findError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();
      
      if (findError || !referrer) {
        throw new Error('Invalid referral code');
      }
      
      return referrer.user_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-referral'] });
    }
  });
}

// Check and award badges based on user activity
export function useCheckBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      // Get user stats
      const [bookingsResult, trainingsResult, groupsResult, referralsResult] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed'),
        supabase.from('service_bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed'),
        supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('referral_count').eq('user_id', user.id).single()
      ]);
      
      const stats = {
        booking_count: bookingsResult.count || 0,
        training_count: trainingsResult.count || 0,
        group_count: groupsResult.count || 0,
        referral_count: referralsResult.data?.referral_count || 0
      };
      
      // Get eligible badges
      const { data: badges } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .not('requirement_type', 'is', null);
      
      // Get already awarded badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);
      
      const awardedIds = new Set((userBadges || []).map(ub => ub.badge_id));
      
      // Award new badges
      const newBadges = (badges || []).filter(badge => {
        if (awardedIds.has(badge.id)) return false;
        const statValue = stats[badge.requirement_type as keyof typeof stats] || 0;
        return statValue >= (badge.requirement_value || 1);
      });
      
      if (newBadges.length > 0) {
        await supabase.from('user_badges').insert(
          newBadges.map(badge => ({
            user_id: user.id,
            badge_id: badge.id
          }))
        );
        
        // Award points for badges
        const totalPoints = newBadges.reduce((sum, b) => sum + (b.points_reward || 0), 0);
        if (totalPoints > 0) {
          await supabase.from('loyalty_ledger').insert({
            user_id: user.id,
            type: 'earned',
            points: totalPoints,
            description: `Badge rewards: ${newBadges.map(b => b.name).join(', ')}`
          });
        }
      }
      
      return newBadges;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
    }
  });
}
