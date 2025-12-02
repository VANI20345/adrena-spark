import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized TanStack Query hooks for Groups
 * - Eliminates N+1 queries with proper JOINs
 * - Fixes 406 errors with correct relation syntax
 * - Provides proper caching and invalidation
 */

// ============= GROUP DETAILS =============
export function useGroupDetails(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-details', groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID required');

      const { data, error } = await supabase
        .from('event_groups')
        .select(`
          *,
          cities!city_id(name, name_ar),
          location_city:cities!location_restriction(name, name_ar),
          group_interests(
            interest_id,
            user_interests:interest_id(id, name, name_ar)
          )
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;

      // Map interests from JOIN
      const interests = (data.group_interests || [])
        .map((gi: any) => gi.user_interests)
        .filter(Boolean);

      return { ...data, interests };
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= GROUP MEMBERS =============
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID required');

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      // Map profile data to flat structure
      return (data || []).map(member => ({
        ...member,
        full_name: member.profiles?.full_name || 'مستخدم',
        avatar_url: member.profiles?.avatar_url
      }));
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= GROUP POSTS WITH PROFILES & LIKES =============
export function useGroupPosts(groupId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['group-posts', groupId, userId],
    queryFn: async () => {
      if (!groupId || !userId) return [];

      // Fetch posts first
      const { data: posts, error } = await supabase
        .from('group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(posts.map(p => p.user_id))];
      
      // Fetch profiles and likes in parallel
      const [profilesResult, likesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        supabase.from('post_likes').select('post_id, user_id').in('post_id', posts.map(p => p.id)).eq('user_id', userId)
      ]);

      // Create maps for O(1) lookups
      const profilesMap = (profilesResult.data || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);
      
      const likedPostIds = new Set((likesResult.data || []).map(l => l.post_id));

      // Map posts with profiles and like status
      return posts.map(post => ({
        ...post,
        profiles: profilesMap[post.user_id] || { full_name: 'مستخدم', avatar_url: '' },
        user_liked: likedPostIds.has(post.id)
      }));
    },
    enabled: !!groupId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= GROUP EVENTS WITH BOOKMARKS =============
export function useGroupEvents(groupId: string | undefined, userId: string | undefined, isOwner: boolean = false) {
  return useQuery({
    queryKey: ['group-events', groupId, userId, isOwner],
    queryFn: async () => {
      if (!groupId || !userId) return [];

      // Build query based on ownership
      let query = supabase
        .from('events')
        .select('*')
        .eq('group_id', groupId);

      // Fix 400 error: Use correct status values
      if (isOwner) {
        query = query.in('status', ['approved', 'pending']);
      } else {
        query = query.eq('status', 'approved');
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) throw error;

      // Get bookmarks for these events in a single query
      const eventIds = (data || []).map(e => e.id);
      const { data: bookmarks } = await supabase
        .from('event_bookmarks')
        .select('event_id, user_id')
        .in('event_id', eventIds)
        .eq('user_id', userId);

      const bookmarkSet = new Set((bookmarks || []).map(b => b.event_id));

      // Map bookmark status
      return (data || []).map(event => ({
        ...event,
        is_bookmarked: bookmarkSet.has(event.id)
      }));
    },
    enabled: !!groupId && !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= GROUP LEADERBOARD =============
export function useGroupLeaderboard(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-leaderboard', groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID required');

      // Get all posts with user IDs
      const { data: posts, error } = await supabase
        .from('group_posts')
        .select('user_id')
        .eq('group_id', groupId);

      if (error) throw error;

      // Count posts per user
      const postCounts = (posts || []).reduce((acc: any, post) => {
        acc[post.user_id] = (acc[post.user_id] || 0) + 1;
        return acc;
      }, {});

      // Get top users
      const topUserIds = Object.entries(postCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([userId]) => userId);

      if (topUserIds.length === 0) return [];

      // Fetch profiles for top users in single query
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', topUserIds);

      if (profileError) throw profileError;

      // Map profiles to leaderboard entries
      const profileMap = (profiles || []).reduce((acc: any, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});

      return Object.entries(postCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .map(([userId, count]: any, index) => ({
          user_id: userId,
          full_name: profileMap[userId]?.full_name || 'مستخدم',
          avatar_url: profileMap[userId]?.avatar_url || '',
          posts_count: count,
          rank: index + 1
        }));
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= PENDING JOIN REQUESTS =============
export function usePendingJoinRequests(groupId: string | undefined, enabled: boolean = false) {
  return useQuery({
    queryKey: ['pending-join-requests', groupId],
    queryFn: async () => {
      if (!groupId) return 0;

      const { count } = await supabase
        .from('group_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'pending');

      return count || 0;
    },
    enabled: !!groupId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// ============= MY GROUPS (ORGANIZER & JOINED) =============
export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-groups', userId],
    queryFn: async () => {
      if (!userId) return { organizer: [], joined: [] };

      // Get organizer groups with single query + JOINs
      const { data: organizerGroups, error: orgError } = await supabase
        .from('event_groups')
        .select(`
          *,
          cities!city_id(name, name_ar),
          group_interests(
            interest_id,
            user_interests:interest_id(name, name_ar)
          )
        `)
        .eq('created_by', userId)
        .is('archived_at', null)
        .limit(6);

      if (orgError) throw orgError;

      // Get joined groups with single query + JOINs
      const { data: joinedData, error: joinError } = await supabase
        .from('group_members')
        .select(`
          role,
          event_groups!inner(
            *,
            cities!city_id(name, name_ar),
            group_interests(
              interest_id,
              user_interests:interest_id(name, name_ar)
            )
          )
        `)
        .eq('user_id', userId)
        .neq('event_groups.created_by', userId)
        .is('event_groups.archived_at', null)
        .limit(6);

      if (joinError) throw joinError;

      // Map interests for organizer groups
      const organizer = (organizerGroups || []).map(group => ({
        ...group,
        interests: (group.group_interests || []).map((gi: any) => gi.user_interests).filter(Boolean)
      }));

      // Map interests for joined groups
      const joined = (joinedData || [])
        .filter((m: any) => m.event_groups)
        .map((m: any) => ({
          ...m.event_groups,
          memberRole: m.role,
          interests: (m.event_groups.group_interests || []).map((gi: any) => gi.user_interests).filter(Boolean)
        }));

      return { organizer, joined };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= DISCOVER GROUPS =============
export function useDiscoverGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['discover-groups', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get user's group IDs in parallel
      const [{ data: createdGroups }, { data: joinedGroups }] = await Promise.all([
        supabase.from('event_groups').select('id').eq('created_by', userId),
        supabase.from('group_members').select('group_id').eq('user_id', userId)
      ]);

      const excludeIds = [
        ...(createdGroups?.map(g => g.id) || []),
        ...(joinedGroups?.map(m => m.group_id) || [])
      ];

      // Build query with JOINs
      let query = supabase
        .from('event_groups')
        .select(`
          *,
          cities!city_id(name, name_ar),
          group_interests(
            interest_id,
            user_interests:interest_id(name, name_ar)
          )
        `)
        .is('archived_at', null);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query
        .order('current_members', { ascending: false })
        .limit(12);

      if (error) throw error;

      // Map interests
      return (data || []).map(group => ({
        ...group,
        interests: (group.group_interests || []).map((gi: any) => gi.user_interests).filter(Boolean)
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= GROUP MEMBERS AVATARS MAP =============
export function useGroupMembersAvatarsMap() {
  return useQuery({
    queryKey: ['group-members-avatars-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          profiles:user_id(avatar_url, full_name)
        `)
        .limit(300);

      if (error) throw error;

      // Group by group_id (take first 3 members per group)
      const membersMap: Record<string, any[]> = {};
      (data || []).forEach((item: any) => {
        const key = item.group_id;
        if (!membersMap[key]) {
          membersMap[key] = [];
        }
        if (membersMap[key].length < 3 && item.profiles) {
          membersMap[key].push(item.profiles);
        }
      });

      return membersMap;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= SEARCH GROUPS WITH FILTERS =============
export function useSearchGroups(searchTerm: string, filters?: {
  interests?: string[];
  cities?: string[];
  memberRange?: [number, number];
  ageRange?: [number, number];
  gender?: string[];
}) {
  return useQuery({
    queryKey: ['search-groups', searchTerm, JSON.stringify(filters)],
    queryFn: async () => {
      if (!searchTerm && !filters) return [];

      let query = supabase
        .from('event_groups')
        .select(`
          *,
          cities!city_id(name, name_ar),
          group_interests(
            interest_id,
            user_interests:interest_id(name, name_ar)
          )
        `)
        .is('archived_at', null);

      // Apply search term
      if (searchTerm) {
        query = query.ilike('group_name', `%${searchTerm}%`);
      }

      // Apply filters
      if (filters) {
        // City filter
        if (filters.cities && filters.cities.length > 0) {
          query = query.in('city_id', filters.cities);
        }

        // Gender filter
        if (filters.gender && filters.gender.length > 0) {
          if (!filters.gender.includes('both')) {
            query = query.in('gender_restriction', filters.gender);
          }
        }

        // Member range filter
        if (filters.memberRange) {
          query = query
            .gte('current_members', filters.memberRange[0])
            .lte('current_members', filters.memberRange[1]);
        }

        // Age range filter - groups that accept users in this age range
        if (filters.ageRange) {
          query = query
            .or(`min_age.lte.${filters.ageRange[1]},min_age.is.null`)
            .or(`max_age.gte.${filters.ageRange[0]},max_age.is.null`);
        }
      }

      const { data, error } = await query.order('current_members', { ascending: false });

      if (error) throw error;

      let results = (data || []).map(group => ({
        ...group,
        interests: (group.group_interests || []).map((gi: any) => gi.user_interests).filter(Boolean)
      }));

      // Apply interest filter in post-processing (since it requires JOIN)
      if (filters?.interests && filters.interests.length > 0) {
        results = results.filter(group => 
          group.interests.some((interest: any) => filters.interests?.includes(interest.id))
        );
      }

      return results;
    },
    enabled: searchTerm.length > 0 || !!(filters && (
      (filters.interests && filters.interests.length > 0) ||
      (filters.cities && filters.cities.length > 0) ||
      (filters.gender && filters.gender.length > 0) ||
      (filters.memberRange && (filters.memberRange[0] !== 0 || filters.memberRange[1] !== 500)) ||
      (filters.ageRange && (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 65))
    )),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// ============= HELPER: INVALIDATE GROUP QUERIES =============
export function useInvalidateGroupQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateGroupDetails: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['group-details', groupId] });
    },
    invalidateGroupMembers: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
    invalidateGroupPosts: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
    invalidateGroupEvents: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
    },
    invalidatePendingRequests: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', groupId] });
    },
    invalidateMyGroups: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
    },
    invalidateAll: (groupId: string) => {
      queryClient.invalidateQueries({ queryKey: ['group-details', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-leaderboard', groupId] });
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests', groupId] });
    }
  };
}
