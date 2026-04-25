import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared hook for fetching total users count across Super Admin pages.
 * Uses auth.users via Edge Function for accurate count.
 * This ensures consistency across Overview, Users Management, Sessions, etc.
 */
export function useTotalUsersCount() {
  return useOptimizedQuery(
    ['total-users-count-shared'],
    async () => {
      try {
        // Use edge function to get accurate auth.users count
        const { data, error } = await supabase.functions.invoke('admin-users', {
          method: 'GET'
        });
        
        if (!error && data) {
          return data.totalCount ?? data.users?.length ?? 0;
        }
        
        // Fallback to profiles count
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        return count || 0;
      } catch (err) {
        console.error('Error fetching total users count:', err);
        // Fallback to profiles count
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        return count || 0;
      }
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes cache
      refetchOnWindowFocus: true,
    }
  );
}

/**
 * Shared hook for fetching all admin users data.
 * Returns full user list with roles and wallets.
 */
export function useAdminUsersData() {
  return useOptimizedQuery(
    ['admin-users-data-shared'],
    async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
          method: 'GET'
        });
        
        if (error) {
          console.error('Error fetching admin users:', error);
          throw error;
        }
        
        return data?.users || [];
      } catch (err) {
        console.error('Error fetching admin users data:', err);
        return [];
      }
    },
    {
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    }
  );
}

/**
 * Shared hook for fetching role distribution statistics
 */
export function useRoleDistribution() {
  return useOptimizedQuery(
    ['role-distribution-shared'],
    async () => {
      try {
        // Fetch all roles
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role');
        
        if (error) throw error;
        
        const adminCount = roles?.filter(r => r.role === 'admin').length || 0;
        const superAdminCount = roles?.filter(r => r.role === 'super_admin').length || 0;
        const providerCount = roles?.filter(r => r.role === 'provider').length || 0;
        const totalAdmins = adminCount + superAdminCount;
        
        return {
          adminCount,
          superAdminCount,
          providerCount,
          totalAdmins,
        };
      } catch (err) {
        console.error('Error fetching role distribution:', err);
        return {
          adminCount: 0,
          superAdminCount: 0,
          providerCount: 0,
          totalAdmins: 0,
        };
      }
    },
    {
      staleTime: 2 * 60 * 1000,
    }
  );
}
