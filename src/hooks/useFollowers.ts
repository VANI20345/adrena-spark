import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FollowerStats {
  followers_count: number;
  following_count: number;
  isFollowing: boolean;
  canFollow: boolean;
}

// Cache for reducing duplicate requests
const statsCache = new Map<string, { data: FollowerStats; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const useFollowers = (targetUserId?: string) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FollowerStats>({
    followers_count: 0,
    following_count: 0,
    isFollowing: false,
    canFollow: true
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${targetUserId}-${user?.id || 'guest'}`;
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setStats(cached.data);
      setLoading(false);
      return;
    }

    try {
      // ✅ OPTIMIZED: Single combined query instead of 4 separate queries
      const queries = [];
      
      // Query 1: Profile stats
      queries.push(
        supabase
          .from('profiles')
          .select('followers_count, following_count')
          .eq('user_id', targetUserId)
          .single()
      );
      
      // Query 2: Check if target is admin
      queries.push(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId)
          .eq('role', 'admin')
          .maybeSingle()
      );
      
      // Query 3: Check if current user is admin (only if logged in)
      if (user) {
        queries.push(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle()
        );
        
        // Query 4: Check following status (only if not self)
        if (targetUserId !== user.id) {
          queries.push(
            supabase
              .from('followers')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', targetUserId)
              .maybeSingle()
          );
        }
      }

      // Execute all queries in parallel
      const results = await Promise.all(queries);
      
      const profileResult = results[0];
      const targetAdminResult = results[1];
      const currentAdminResult = user ? results[2] : null;
      const followingResult = user && targetUserId !== user.id ? results[3] || results[2] : null;

      if (profileResult.error) throw profileResult.error;

      const targetIsAdmin = !!targetAdminResult.data;
      const currentUserIsAdmin = !!currentAdminResult?.data;
      const isFollowing = !!followingResult?.data;

      setIsAdmin(targetIsAdmin);

      // Can follow if: not self, not already following, and (target not admin OR current user is admin)
      const canFollow = 
        user?.id !== targetUserId && 
        !isFollowing && 
        (!targetIsAdmin || currentUserIsAdmin);

      const newStats: FollowerStats = {
        followers_count: profileResult.data?.followers_count || 0,
        following_count: profileResult.data?.following_count || 0,
        isFollowing,
        canFollow
      };

      setStats(newStats);
      
      // Update cache
      statsCache.set(cacheKey, { data: newStats, timestamp: Date.now() });
    } catch (error: any) {
      console.error('Error fetching follower stats:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    fetchStats();

    if (!targetUserId) return;

    // ✅ OPTIMIZED: Single channel with both filters
    const channel = supabase
      .channel(`followers-${targetUserId}-${user?.id || 'guest'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${targetUserId},follower_id=eq.${targetUserId}`
        },
        () => {
          // Clear cache on update
          const cacheKey = `${targetUserId}-${user?.id || 'guest'}`;
          statsCache.delete(cacheKey);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, user, fetchStats]);

  const followUser = async () => {
    if (!user || !targetUserId) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    if (!stats.canFollow) {
      toast.error('لا يمكن متابعة هذا المستخدم');
      return false;
    }

    // Clear cache immediately
    const cacheKey = `${targetUserId}-${user.id}`;
    statsCache.delete(cacheKey);

    // Optimistic update
    const previousStats = { ...stats };
    setStats(prev => ({
      ...prev,
      isFollowing: true,
      followers_count: prev.followers_count + 1
    }));

    try {
      const { data, error } = await supabase.functions.invoke('follow-user', {
        body: {
          target_user_id: targetUserId,
          action: 'follow'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to follow');

      toast.success('تم المتابعة بنجاح');
      return true;
    } catch (error: any) {
      console.error('Error following user:', error);
      // Revert optimistic update
      setStats(previousStats);
      toast.error('فشل في المتابعة');
      return false;
    }
  };

  const unfollowUser = async () => {
    if (!user || !targetUserId) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    // Clear cache immediately
    const cacheKey = `${targetUserId}-${user.id}`;
    statsCache.delete(cacheKey);

    // Optimistic update
    const previousStats = { ...stats };
    setStats(prev => ({
      ...prev,
      isFollowing: false,
      followers_count: Math.max(0, prev.followers_count - 1)
    }));

    try {
      const { data, error } = await supabase.functions.invoke('follow-user', {
        body: {
          target_user_id: targetUserId,
          action: 'unfollow'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to unfollow');

      toast.success('تم إلغاء المتابعة');
      return true;
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      // Revert optimistic update
      setStats(previousStats);
      toast.error('فشل في إلغاء المتابعة');
      return false;
    }
  };

  return {
    ...stats,
    loading,
    isAdmin,
    followUser,
    unfollowUser,
    refetch: fetchStats
  };
};
