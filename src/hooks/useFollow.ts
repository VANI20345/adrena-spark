import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface FollowUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_id: string;
  bio: string | null;
  followers_count?: number;
  following_count?: number;
  is_private?: boolean;
}

interface MutualFriend {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_id: string;
}

export const useFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguageContext();
  const queryClient = useQueryClient();

  // Check if current user is following target user
  const { data: isFollowing, isLoading: isCheckingFollow } = useQuery({
    queryKey: ['is-following', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId || user.id === targetUserId) return false;
      
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });

  // Check if target user is following current user (for "Follow Back" display)
  const { data: isFollowedBy } = useQuery({
    queryKey: ['is-followed-by', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId || user.id === targetUserId) return false;
      
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId)
        .eq('following_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });

  // Check if there's a pending follow request
  const { data: pendingRequest } = useQuery({
    queryKey: ['follow-request', user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId) return null;
      
      const { data, error } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async ({ userId, isPrivate }: { userId: string; isPrivate?: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      if (isPrivate) {
        // Send follow request for private profiles
        const { error } = await supabase
          .from('follow_requests')
          .insert({
            requester_id: user.id,
            target_id: userId,
          });
        if (error) throw error;
        return { type: 'request' as const };
      } else {
        // Direct follow for public profiles
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });
        if (error) throw error;
        return { type: 'follow' as const };
      }
    },
    onSuccess: (result, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['follow-request', user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      
      toast({
        title: result.type === 'request' 
          ? (language === 'ar' ? 'تم إرسال الطلب!' : 'Request Sent!')
          : (language === 'ar' ? 'تمت المتابعة!' : 'Followed!'),
        description: result.type === 'request' 
          ? (language === 'ar' ? 'تم إرسال طلب المتابعة الخاص بك.' : 'Your follow request has been sent.')
          : (language === 'ar' ? 'أنت الآن تتابع هذا المستخدم.' : 'You are now following this user.'),
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في متابعة المستخدم' : 'Failed to follow user'),
        variant: 'destructive',
        duration: 8000,
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: language === 'ar' ? 'تم إلغاء المتابعة' : 'Unfollowed',
        description: language === 'ar' ? 'لقد ألغيت متابعة هذا المستخدم.' : 'You have unfollowed this user.',
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في إلغاء متابعة المستخدم' : 'Failed to unfollow user'),
        variant: 'destructive',
        duration: 8000,
      });
    },
  });

  // Cancel follow request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('follow_requests')
        .delete()
        .eq('requester_id', user.id)
        .eq('target_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-request', user?.id, userId] });
      toast({
        title: language === 'ar' ? 'تم إلغاء الطلب' : 'Request Cancelled',
        description: language === 'ar' ? 'تم إلغاء طلب المتابعة الخاص بك.' : 'Your follow request has been cancelled.',
        duration: 8000,
      });
    },
  });

  const toggleFollow = useCallback((userId: string, isPrivate?: boolean) => {
    if (pendingRequest) {
      cancelRequestMutation.mutate(userId);
    } else if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate({ userId, isPrivate });
    }
  }, [isFollowing, pendingRequest, followMutation, unfollowMutation, cancelRequestMutation]);

  return {
    isFollowing: isFollowing ?? false,
    isFollowedBy: isFollowedBy ?? false,
    hasPendingRequest: !!pendingRequest,
    isCheckingFollow,
    isLoading: followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending,
    followUser: (userId: string, isPrivate?: boolean) => followMutation.mutate({ userId, isPrivate }),
    unfollowUser: unfollowMutation.mutate,
    cancelRequest: cancelRequestMutation.mutate,
    toggleFollow,
  };
};

// Hook to get followers list - Uses separate queries due to no FK constraints
export const useFollowers = (userId?: string) => {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async (): Promise<FollowUser[]> => {
      if (!userId) return [];

      // First get all follower IDs
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      if (!followsData || followsData.length === 0) return [];

      // Get unique follower IDs
      const followerIds = followsData.map(f => f.follower_id);

      // Then fetch profiles for those users using public view
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, display_id, bio, followers_count, following_count, profile_visibility')
        .in('user_id', followerIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Return profiles in the same order as follows, filtering out any missing profiles
      return followsData
        .map(follow => {
          const profile = profilesMap.get(follow.follower_id);
          if (!profile) return null;
          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            display_id: profile.display_id,
            bio: profile.bio,
            followers_count: profile.followers_count || 0,
            following_count: profile.following_count || 0,
            is_private: profile.profile_visibility === 'private',
          };
        })
        .filter((u): u is NonNullable<typeof u> => u !== null) as FollowUser[];
    },
    enabled: !!userId,
  });
};

// Hook to get following list - Uses separate queries due to no FK constraints
export const useFollowing = (userId?: string) => {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async (): Promise<FollowUser[]> => {
      if (!userId) return [];

      // First get all following IDs
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      if (!followsData || followsData.length === 0) return [];

      // Get unique following IDs
      const followingIds = followsData.map(f => f.following_id);

      // Then fetch profiles for those users using public view
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, display_id, bio, followers_count, following_count, profile_visibility')
        .in('user_id', followingIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Return profiles in the same order as follows, filtering out any missing profiles
      return followsData
        .map(follow => {
          const profile = profilesMap.get(follow.following_id);
          if (!profile) return null;
          return {
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            display_id: profile.display_id,
            bio: profile.bio,
            followers_count: profile.followers_count || 0,
            following_count: profile.following_count || 0,
            is_private: profile.profile_visibility === 'private',
          };
        })
        .filter((u): u is NonNullable<typeof u> => u !== null) as FollowUser[];
    },
    enabled: !!userId,
  });
};

// Hook to get mutual followers between current user and another user
export const useMutualFollowers = (targetUserId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mutual-followers', user?.id, targetUserId],
    queryFn: async (): Promise<MutualFriend[]> => {
      if (!user?.id || !targetUserId || user.id === targetUserId) return [];

      const { data, error } = await supabase
        .rpc('get_mutual_followers', {
          user_a: user.id,
          user_b: targetUserId,
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
  });
};

// Hook to get incoming follow requests
export const useFollowRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['follow-requests-incoming', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('follow_requests')
        .select(`
          id,
          requester_id,
          message,
          created_at,
          requester:profiles!follow_requests_requester_id_fkey (
            user_id,
            full_name,
            avatar_url,
            display_id,
            bio
          )
        `)
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

// Hook to respond to follow requests
export const useRespondToRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguageContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('follow_requests')
        .select('requester_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update the request status
      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({
          status: accept ? 'approved' : 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If accepted, create the follow relationship
      if (accept && request) {
        const { error: followError } = await supabase
          .from('follows')
          .insert({
            follower_id: request.requester_id,
            following_id: user.id,
          });

        if (followError) throw followError;
      }

      return { accept, requesterId: request?.requester_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests-incoming'] });
      queryClient.invalidateQueries({ queryKey: ['followers', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      
      toast({
        title: result.accept 
          ? (language === 'ar' ? 'تم قبول الطلب' : 'Request Accepted')
          : (language === 'ar' ? 'تم رفض الطلب' : 'Request Declined'),
        description: result.accept 
          ? (language === 'ar' ? 'يمكنهم الآن رؤية منشوراتك ونشاطاتك.' : 'They can now see your posts and activities.')
          : (language === 'ar' ? 'تم رفض طلب المتابعة.' : 'The follow request has been declined.'),
        duration: 8000,
      });
    },
  });
};

// Hook to get suggested users to follow with mutual info and shared groups
export const useSuggestedUsers = (limit = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggested-users', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get users already followed
      const { data: followingIds } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const excludeIds = [user.id, ...(followingIds?.map(f => f.following_id) || [])];

      // Get users in same groups as current user with group names
      const { data: userGroupMemberships } = await supabase
        .from('group_memberships')
        .select('group_id, groups(id, group_name)')
        .eq('user_id', user.id);

      const groupIds = userGroupMemberships?.map(g => g.group_id) || [];
      const groupNamesMap = new Map<string, string>();
      userGroupMemberships?.forEach(g => {
        if (g.groups && 'group_name' in g.groups) {
          groupNamesMap.set(g.group_id, (g.groups as any).group_name);
        }
      });

      // Get users from shared groups with their group memberships
      let sharedGroupUserMap: Map<string, { group_id: string; group_name: string }[]> = new Map();
      if (groupIds.length > 0) {
        const { data: groupMembers } = await supabase
          .from('group_memberships')
          .select('user_id, group_id')
          .in('group_id', groupIds)
          .neq('user_id', user.id);
        
        groupMembers?.forEach(m => {
          const existing = sharedGroupUserMap.get(m.user_id) || [];
          const groupName = groupNamesMap.get(m.group_id);
          if (groupName) {
            existing.push({ group_id: m.group_id, group_name: groupName });
          }
          sharedGroupUserMap.set(m.user_id, existing);
        });
      }

      const sharedGroupUsers = [...sharedGroupUserMap.keys()];

      // Get mutual followers (followers of people I follow who also follow me back)
      const { data: myFollowers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);
      
      const myFollowerIds = myFollowers?.map(f => f.follower_id) || [];

      // Get profiles for all users
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, display_id, bio, interests, followers_count, following_count, profile_visibility')
        .not('user_id', 'in', `(${excludeIds.join(',')})`)
        .order('followers_count', { ascending: false })
        .limit(limit * 2); // Get more to allow filtering/sorting

      if (error) throw error;

      // Enrich users with suggestion reason and shared groups
      const enrichedUsers = (data || []).map(u => {
        const isFromMutualGroup = sharedGroupUsers.includes(u.user_id);
        const isFollowedByFollowers = myFollowerIds.includes(u.user_id);
        const userSharedGroups = sharedGroupUserMap.get(u.user_id) || [];
        
        let suggestionReason: 'mutual_group' | 'mutual_connection' | 'popular' | null = null;
        if (isFromMutualGroup) {
          suggestionReason = 'mutual_group';
        } else if (isFollowedByFollowers) {
          suggestionReason = 'mutual_connection';
        } else if ((u.followers_count || 0) > 10) {
          suggestionReason = 'popular';
        }

        return {
          ...u,
          is_private: u.profile_visibility === 'private',
          suggestion_reason: suggestionReason,
          shared_groups: userSharedGroups,
        };
      });

      // Sort: mutual groups first, then mutual connections, then popular
      return enrichedUsers
        .sort((a, b) => {
          const priority: Record<string, number> = { mutual_group: 0, mutual_connection: 1, popular: 2 };
          const aPriority = a.suggestion_reason ? priority[a.suggestion_reason] : 3;
          const bPriority = b.suggestion_reason ? priority[b.suggestion_reason] : 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return (b.followers_count || 0) - (a.followers_count || 0);
        })
        .slice(0, limit);
    },
    enabled: !!user?.id,
  });
};

// Hook to search users
export const useSearchUsers = (searchTerm: string, includeSelf = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-users', searchTerm, includeSelf, user?.id],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      let query = supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, display_id, bio, followers_count, following_count, profile_visibility')
        .or(`full_name.ilike.%${searchTerm}%,display_id.ilike.%${searchTerm}%`)
        .order('followers_count', { ascending: false })
        .limit(20);

      // Only exclude self if explicitly requested
      if (!includeSelf && user?.id) {
        query = query.neq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort to show current user first if they match the search
      const results = (data || []).map(u => ({
        ...u,
        is_private: u.profile_visibility === 'private',
        is_self: u.user_id === user?.id,
      }));
      
      // Move self to the top of results if present
      return results.sort((a, b) => {
        if (a.is_self && !b.is_self) return -1;
        if (!a.is_self && b.is_self) return 1;
        return 0;
      });
    },
    enabled: searchTerm.length >= 2,
  });
};
