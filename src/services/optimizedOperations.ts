import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * ✅ OPTIMIZED: Enhanced operations service with better caching and batching
 */

// Enhanced cache with TTL and size limits
interface CacheEntry<T> {
  timestamp: number;
  promise: Promise<T>;
  data?: T;
}

const operationCache = new Map<string, CacheEntry<any>>();
const MAX_CACHE_SIZE = 100;
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Clear old cache entries when cache is full
 */
function cleanupCache() {
  if (operationCache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    const entries = Array.from(operationCache.entries());
    
    // Remove expired entries first
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > CACHE_DURATION) {
        operationCache.delete(key);
      }
    }
    
    // If still too big, remove oldest entries
    if (operationCache.size >= MAX_CACHE_SIZE) {
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sortedEntries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
      toRemove.forEach(([key]) => operationCache.delete(key));
    }
  }
}

/**
 * Deduplicate and cache operations with better performance
 */
function withCache<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = operationCache.get(key);

  // Return cached promise if still valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }

  cleanupCache();

  // Create new operation
  const promise = operation().finally(() => {
    // Clean up cache after completion
    setTimeout(() => operationCache.delete(key), CACHE_DURATION * 2);
  });

  operationCache.set(key, { timestamp: now, promise });
  return promise;
}

/**
 * Optimized event/service approval with background processing
 */
export async function approveEventOrService(
  id: string,
  type: 'event' | 'service',
  optimisticUpdate?: (id: string) => void
) {
  const cacheKey = `approve-${type}-${id}`;

  return withCache(cacheKey, async () => {
    // Optimistic update
    if (optimisticUpdate) {
      optimisticUpdate(id);
    }

    const table = type === 'event' ? 'events' : 'services';

    const { error } = await supabase
      .from(table)
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      console.error(`Error approving ${type}:`, error);
      toast.error(`فشل في الموافقة على ${type === 'event' ? 'الفعالية' : 'الخدمة'}`);
      throw error;
    }

    toast.success(`تم الموافقة على ${type === 'event' ? 'الفعالية' : 'الخدمة'} بنجاح`);
    return { success: true };
  });
}

/**
 * Optimized friend request acceptance
 */
export async function acceptFriendRequest(
  requestId: string,
  optimisticUpdate?: (id: string) => void
) {
  const cacheKey = `accept-friend-${requestId}`;

  return withCache(cacheKey, async () => {
    // Optimistic update
    if (optimisticUpdate) {
      optimisticUpdate(requestId);
    }

    const { error } = await supabase.functions.invoke('manage-friend-request', {
      body: { request_id: requestId, action: 'accept' }
    });

    if (error) {
      console.error('Error accepting friend request:', error);
      toast.error('فشل في قبول طلب الصداقة');
      throw error;
    }

    toast.success('تم قبول طلب الصداقة');
    return { success: true };
  });
}

/**
 * Optimized group creation with immediate feedback
 */
export async function createGroupOptimized(
  groupData: {
    group_name: string;
    description?: string;
    event_id?: string;
    created_by: string;
  },
  onSuccess?: (groupId: string) => void
) {
  const cacheKey = `create-group-${Date.now()}`;

  return withCache(cacheKey, async () => {
    // Show immediate feedback
    const loadingToast = toast.loading('جاري إنشاء المجموعة...');

    try {
      const { data, error } = await supabase
        .from('event_groups')
        .insert([groupData])
        .select()
        .single();

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('تم إنشاء المجموعة بنجاح');

      if (onSuccess && data) {
        onSuccess(data.id);
      }

      return { success: true, data };
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error creating group:', error);
      toast.error('فشل في إنشاء المجموعة');
      throw error;
    }
  });
}

/**
 * Optimized message sending with retry
 */
export async function sendMessageOptimized(
  groupId: string,
  content: string,
  senderId: string,
  retries = 3
): Promise<{ success: boolean; messageId?: string }> {
  const cacheKey = `send-message-${groupId}-${Date.now()}`;

  return withCache(cacheKey, async () => {
    let lastError: any;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('group_messages')
          .insert([
            {
              group_id: groupId,
              content,
              sender_id: senderId,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        return { success: true, messageId: data.id };
      } catch (error) {
        lastError = error;
        console.error(`Message send attempt ${attempt + 1} failed:`, error);

        // Wait before retry with exponential backoff
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    toast.error('فشل في إرسال الرسالة');
    throw lastError;
  });
}

/**
 * Batch operations for multiple items
 */
export async function batchApprove(
  items: Array<{ id: string; type: 'event' | 'service' }>,
  onProgress?: (completed: number, total: number) => void
) {
  const results: Array<{ id: string; success: boolean; error?: any }> = [];
  const total = items.length;

  // Process in batches of 5 for optimal performance
  const BATCH_SIZE = 5;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(({ id, type }) =>
        approveEventOrService(id, type).then(() => ({ id, success: true }))
      )
    );

    batchResults.forEach((result, index) => {
      const item = batch[index];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ id: item.id, success: false, error: result.reason });
      }
    });

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, total), total);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  toast.success(`تم الموافقة على ${successCount} من ${total} عنصر`);

  return results;
}

/**
 * Clear operation cache (useful for manual refresh)
 */
export function clearOperationCache() {
  operationCache.clear();
}

/**
 * ✅ NEW: Admin-specific optimized operations
 */

/**
 * Fetch admin stats with caching
 */
export async function fetchAdminStats() {
  return withCache('admin-stats', async () => {
    const [usersCount, eventsCount, servicesCount, bookingsCount, categoriesCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalUsers: usersCount.count || 0,
      userGrowth: '+0%',
      totalEvents: eventsCount.count || 0,
      eventGrowth: '+0%',
      totalServices: servicesCount.count || 0,
      totalRevenue: 0,
      revenueGrowth: '+0%',
      activeBookings: bookingsCount.count || 0,
      totalCategories: categoriesCount.count || 0,
      pendingReviews: (eventsCount.count || 0) + (servicesCount.count || 0),
    };
  });
}

/**
 * Batch update user roles
 */
export async function batchUpdateUserRoles(
  updates: Array<{ userId: string; role: string }>,
  onProgress?: (completed: number, total: number) => void
) {
  const results: Array<{ userId: string; success: boolean; error?: any }> = [];
  const total = updates.length;
  const BATCH_SIZE = 5;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ userId, role }) => {
        try {
          const { error } = await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: role as any });
          
          if (error) throw error;
          return { userId, success: true };
        } catch (error) {
          return { userId, success: false, error };
        }
      })
    );

    batchResults.forEach((result, index) => {
      const update = batch[index];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ userId: update.userId, success: false, error: result.reason });
      }
    });

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, total), total);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  toast.success(`تم تحديث ${successCount} من ${total} مستخدم`);

  return results;
}

/**
 * Optimized pending items fetcher
 */
export async function fetchPendingItems() {
  return withCache('pending-items', async () => {
    const [events, services] = await Promise.all([
      supabase.from('events').select('*').eq('status', 'pending'),
      supabase.from('services').select('*').eq('status', 'pending')
    ]);

    return {
      events: events.data || [],
      services: services.data || [],
    };
  });
}

/**
 * Optimized user list with pagination
 */
export async function fetchUsersPage(page: number = 0, pageSize: number = 50) {
  const cacheKey = `users-page-${page}-${pageSize}`;
  
  return withCache(cacheKey, async () => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('profiles')
      .select('*, user_roles(*)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      users: data || [],
      total: count || 0,
      hasMore: (count || 0) > to + 1,
    };
  });
}
