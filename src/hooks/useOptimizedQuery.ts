import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optimized query hook with smart caching and deduplication
 */
export function useOptimizedQuery<T = any>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: fetcher,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    ...options,
  });
}

/**
 * Get user profile with caching
 */
export function useUserProfile(userId?: string) {
  return useOptimizedQuery(
    ['user-profile', userId],
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      enabled: !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes for profiles
    }
  );
}

/**
 * Get user role with caching
 */
export function useUserRole(userId?: string) {
  return useOptimizedQuery(
    ['user-role', userId],
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.role || null;
    },
    {
      enabled: !!userId,
      staleTime: 15 * 60 * 1000, // 15 minutes for roles (rarely change)
    }
  );
}

/**
 * Combined user data hook (profile + role) with single query
 */
export function useUserData(userId?: string) {
  return useOptimizedQuery(
    ['user-data', userId],
    async () => {
      if (!userId) return null;
      
      // Single parallel query instead of multiple sequential ones
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);
      
      if (profileResult.error) throw profileResult.error;
      
      return {
        profile: profileResult.data,
        role: roleResult.data?.role || null,
      };
    },
    {
      enabled: !!userId,
      staleTime: 10 * 60 * 1000,
    }
  );
}

/**
 * Check if user is admin with caching
 */
export function useIsAdmin(userId?: string) {
  return useOptimizedQuery(
    ['is-admin', userId],
    async () => {
      if (!userId) return false;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      return !!data;
    },
    {
      enabled: !!userId,
      staleTime: 15 * 60 * 1000,
    }
  );
}
