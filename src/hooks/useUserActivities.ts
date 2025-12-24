import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_data: any;
  visibility: string;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
    display_id: string;
  };
}

// Get activities from users the current user follows
export const useFollowingActivities = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['following-activities', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get list of users being followed
      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) return [];

      // Get activities from followed users
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .in('user_id', followingIds)
        .in('visibility', ['public', 'followers'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user profiles for activities
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, display_id')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id),
      })) as UserActivity[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });
};

// Get activities for a specific user
export const useUserActivities = (userId?: string, limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-activities', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      // Check if current user follows this user
      let isFollowing = false;
      if (user?.id && user.id !== userId) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        isFollowing = !!followData;
      }

      // Build visibility filter
      const visibilityFilter = user?.id === userId 
        ? ['public', 'followers', 'private'] 
        : isFollowing 
          ? ['public', 'followers'] 
          : ['public'];

      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .in('visibility', visibilityFilter)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as UserActivity[];
    },
    enabled: !!userId,
  });
};

// Get suggested events based on followed users
export const useFriendEvents = (limit = 6) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-events', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get list of users being followed
      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) return [];

      // Get event activities from followed users
      const { data: activities, error } = await supabase
        .from('user_activities')
        .select('entity_id, entity_data, user_id, created_at')
        .in('user_id', followingIds)
        .eq('entity_type', 'event')
        .eq('activity_type', 'joined_event')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter duplicates

      if (error) throw error;

      // Get unique event IDs
      const uniqueEventIds = [...new Set((activities || []).map(a => a.entity_id))].slice(0, limit);

      // Get event details
      const { data: events } = await supabase
        .from('events')
        .select('id, title, title_ar, image_url, location, location_ar, start_date, price')
        .in('id', uniqueEventIds)
        .gte('start_date', new Date().toISOString())
        .eq('status', 'approved');

      // Get user profiles
      const userIds = [...new Set((activities || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Combine events with friend info
      return (events || []).map(event => {
        const friendActivity = activities?.find(a => a.entity_id === event.id);
        return {
          ...event,
          friend: friendActivity ? profileMap.get(friendActivity.user_id) : null,
        };
      });
    },
    enabled: !!user?.id,
  });
};

// Get suggested groups based on followed users
export const useFriendGroups = (limit = 6) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-groups', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get list of users being followed
      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) return [];

      // Get group activities from followed users
      const { data: activities, error } = await supabase
        .from('user_activities')
        .select('entity_id, entity_data, user_id, created_at')
        .in('user_id', followingIds)
        .eq('entity_type', 'group')
        .eq('activity_type', 'joined_group')
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      if (error) throw error;

      // Get unique group IDs
      const uniqueGroupIds = [...new Set((activities || []).map(a => a.entity_id))].slice(0, limit);

      // Get groups the user is not already a member of
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const userGroupIds = userGroups?.map(g => g.group_id) || [];
      const filteredGroupIds = uniqueGroupIds.filter(id => !userGroupIds.includes(id));

      if (filteredGroupIds.length === 0) return [];

      // Get group details
      const { data: groups } = await supabase
        .from('event_groups')
        .select('id, group_name, image_url, description, current_members, max_members')
        .in('id', filteredGroupIds)
        .is('archived_at', null);

      // Get user profiles
      const userIds = [...new Set((activities || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (groups || []).map(group => {
        const friendActivity = activities?.find(a => a.entity_id === group.id);
        return {
          ...group,
          friend: friendActivity ? profileMap.get(friendActivity.user_id) : null,
        };
      });
    },
    enabled: !!user?.id,
  });
};
