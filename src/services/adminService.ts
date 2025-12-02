import { supabase } from '@/integrations/supabase/client';

export const adminService = {
  // Statistics
  async getOverviewStats() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        usersResult,
        lastMonthUsersResult,
        eventsResult,
        lastMonthEventsResult,
        servicesResult,
        bookingsResult,
        lastMonthBookingsResult,
        categoriesResult,
        pendingEventsResult,
        pendingServicesResult,
        activeUsersResult,
        inactiveUsersResult,
        pendingVerificationsResult,
        openTicketsResult,
        allBookingsResult,
        confirmedBookingsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('bookings').select('total_amount').eq('status', 'confirmed'),
        supabase.from('bookings').select('total_amount').eq('status', 'confirmed').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_activity', thirtyDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('last_activity', thirtyDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
      ]);

      const totalUsers = usersResult.count || 0;
      const lastMonthUsers = lastMonthUsersResult.count || 0;
      const totalEvents = eventsResult.count || 0;
      const lastMonthEvents = lastMonthEventsResult.count || 0;
      const totalServices = servicesResult.count || 0;
      const bookingsData = bookingsResult.data || [];
      const lastMonthBookings = lastMonthBookingsResult.data || [];
      const totalCategories = categoriesResult.count || 0;
      const pendingEvents = pendingEventsResult.count || 0;
      const pendingServices = pendingServicesResult.count || 0;
      const activeUsers = activeUsersResult.count || 0;
      const inactiveUsers = inactiveUsersResult.count || 0;

      const pendingReviewsCount = pendingEvents + pendingServices;
      const totalRevenue = bookingsData.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

      // Calculate KPIs
      const dauMau = totalUsers > 0 ? activeUsers / totalUsers : 0;
      const userChurn = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;
      const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;
      const bookingConversion = (allBookingsResult.count || 0) > 0 
        ? ((confirmedBookingsResult.count || 0) / (allBookingsResult.count || 0)) * 100 
        : 0;

      const userGrowth = lastMonthUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : '0';
      const eventGrowth = lastMonthEvents > 0 ? ((totalEvents - lastMonthEvents) / lastMonthEvents * 100).toFixed(1) : '0';
      const revenueGrowth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : '0';

      return {
        totalUsers,
        userGrowth: `${userGrowth}%`,
        totalEvents,
        eventGrowth: `${eventGrowth}%`,
        totalServices,
        totalRevenue,
        revenueGrowth: `${revenueGrowth}%`,
        activeBookings: bookingsData.length,
        totalCategories,
        pendingReviews: pendingReviewsCount,
        dauMau,
        userChurn,
        arpu,
        bookingConversion,
        pendingVerifications: pendingVerificationsResult.count || 0,
        openSupportTickets: openTicketsResult.count || 0
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return {
        totalUsers: 0,
        userGrowth: '0%',
        totalEvents: 0,
        eventGrowth: '0%',
        totalServices: 0,
        totalRevenue: 0,
        revenueGrowth: '0%',
        activeBookings: 0,
        totalCategories: 0,
        pendingReviews: 0,
        dauMau: 0,
        userChurn: 0,
        arpu: 0,
        bookingConversion: 0,
        pendingVerifications: 0,
        openSupportTickets: 0
      };
    }
  },

  // Users Management
  async getAllUsers() {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'GET'
      });
      if (error) throw error;
      return data?.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  async updateUserRole(userId: string, role: 'attendee' | 'provider' | 'organizer' | 'admin') {
    try {
      // Get user info first
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', userId)
        .single();

      const { error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId, role },
      });
      if (error) throw error;

      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'role_update',
          entityType: 'user',
          entityId: userId,
          details: { 
            newRole: role,
            user_name: userProfile?.full_name || 'غير معروف'
          }
        }
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  async suspendUser(userId: string, reason: string, durationDays?: number) {
    try {
      console.log('Starting user suspension:', { userId, reason, durationDays });
      
      // Get user info first
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      const suspendedAt = new Date();
      const suspendedUntil = durationDays 
        ? new Date(suspendedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      const currentUser = await supabase.auth.getUser();
      console.log('Current admin user:', currentUser.data.user?.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          suspended: true,
          suspension_reason: reason,
          suspended_at: suspendedAt.toISOString(),
          suspended_until: suspendedUntil?.toISOString() || null,
          suspended_by: currentUser.data.user?.id
        })
        .eq('user_id', userId)
        .select();
      
      console.log('Suspension update result:', { data, error });
      
      if (error) {
        console.error('Suspension update failed:', error);
        throw error;
      }

      console.log('User suspended successfully, logging activity...');
      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'user_suspended',
          entityType: 'user',
          entityId: userId,
          details: { 
            reason, 
            suspendedUntil: suspendedUntil?.toISOString() || 'permanent',
            durationDays,
            user_name: userProfile?.full_name || 'غير معروف'
          }
        }
      }).catch(err => console.error('Failed to log activity:', err));

      console.log('Sending suspension email...');
      await supabase.functions.invoke('send-suspension-email', {
        body: { userId, reason, suspendedUntil: suspendedUntil?.toISOString() || null }
      }).catch(err => console.error('Failed to send email:', err));
      
      console.log('Suspension completed successfully');
      return data;
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  },

  async unsuspendUser(userId: string) {
    try {
      console.log('Starting user unsuspension:', userId);
      
      // Get user info first
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          suspended: false,
          suspension_reason: null,
          suspended_at: null,
          suspended_until: null,
          suspended_by: null
        })
        .eq('user_id', userId)
        .select();
      
      console.log('Unsuspension result:', { data, error });
      
      if (error) {
        console.error('Unsuspension failed:', error);
        throw error;
      }

      console.log('Logging unsuspension activity...');
      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'user_unsuspended',
          entityType: 'user',
          entityId: userId,
          details: {
            user_name: userProfile?.full_name || 'غير معروف'
          }
        }
      }).catch(err => console.error('Failed to log activity:', err));

      console.log('Unsuspension completed successfully');
      return data;
    } catch (error) {
      console.error('Error unsuspending user:', error);
      throw error;
    }
  },
  async getSuspendedUsers() {
    const { data, error } = await supabase
      .from('suspended_users')
      .select('*')
      .order('suspended_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async deleteUser(userId: string) {
    try {
      console.log('Attempting to delete user:', userId);
      
      // Get user info before deletion
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      const { error } = await supabase.rpc('delete_user_completely', {
        target_user_id: userId
      });
      
      if (error) {
        console.error('Delete user error:', error);
        throw error;
      }
      
      // Log deletion activity
      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'user_deleted',
          entityType: 'user',
          entityId: userId,
          details: {
            user_name: userProfile?.full_name || 'غير معروف'
          }
        }
      }).catch(err => console.error('Failed to log activity:', err));
      
      console.log('User deleted successfully');
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  },

  // Categories Management
  async createCategory(data: { name: string; name_ar: string; description?: string; description_ar?: string; icon_name?: string }) {
    const { error } = await supabase
      .from('categories')
      .insert(data);
    if (error) throw error;
  },

  async updateCategory(id: string, data: any) {
    const { error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Financial Reports
  async getFinancialReports() {
    const { data } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    const monthlyRevenue = data?.reduce((acc: any, payment) => {
      const month = new Date(payment.created_at).toLocaleString('ar-SA', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + Number(payment.amount);
      return acc;
    }, {});

    return Object.entries(monthlyRevenue || {}).map(([month, amount]) => ({ month, amount }));
  },

  async getStuckPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*, bookings(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    return data || [];
  },

  async retryPayment(paymentId: string) {
    // This would integrate with your payment processor
    const { error } = await supabase
      .from('payments')
      .update({ status: 'processing' })
      .eq('id', paymentId);
    if (error) throw error;
  },

  // System Logs
  async getSystemLogs(limit = 50) {
    const { data } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  },

  async clearSystemLogs() {
    const { error } = await supabase
      .from('system_logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (error) throw error;
  },

  // System Settings
  async getSystemSettings() {
    const { data } = await supabase
      .from('system_settings')
      .select('*');

    return data?.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {}) || {};
  },

  async updateSystemSetting(key: string, value: any) {
    const { error } = await supabase
      .from('system_settings')
      .update({ value })
      .eq('key', key);
    if (error) throw error;
  },

  // Send Notifications via Edge Function to bypass RLS safely
  async sendNotification(data: { userIds: string[]; title: string; message: string; type: string }) {
    const { error } = await supabase.functions.invoke('send-notifications', {
      body: {
        user_ids: data.userIds,
        title: data.title,
        message: data.message,
        type: data.type,
        send_email: false,
        send_sms: false,
      },
    });
    if (error) throw error;
  },

  async sendBulkNotification(data: { title: string; message: string; type: string; role?: 'attendee' | 'provider' | 'admin' }) {
    const { error } = await supabase.functions.invoke('send-notifications', {
      body: {
        target_role: data.role, // Pass role to edge function for server-side resolution
        title: data.title,
        message: data.message,
        type: data.type,
        send_email: false,
        send_sms: false,
      },
    });
    if (error) throw error;
  },

  // Export users to CSV
  async exportUsers() {
    const users = await this.getAllUsers();
    const csvContent = [
      ['الاسم', 'الدور', 'النقاط', 'الرصيد', 'تاريخ التسجيل'],
      ...users.map((u: any) => [
        u.full_name || 'غير محدد',
        u.user_roles?.[0]?.role || 'غير محدد',
        u.points_balance || 0,
        u.user_wallets?.[0]?.balance || 0,
        new Date(u.created_at).toLocaleDateString('ar-SA')
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users-export-${new Date().toISOString()}.csv`;
    link.click();
  },

  // Provider Verification Management
  async getPendingProviders() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending')
        .not('service_types', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending providers:', error);
      return [];
    }
  },

  async approveProvider(userId: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', userId)
        .single();
      
      if (profileError) throw profileError;

      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'approved' })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Send approval notification via edge function
      await supabase.functions.invoke('send-verification-status', {
        body: { 
          userId, 
          status: 'approved',
          userName: profile?.full_name,
          userEmail: profile?.email
        }
      });

      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'approve_provider',
          entityType: 'user',
          entityId: userId,
          details: { 
            user_name: profile?.full_name || 'غير معروف'
          }
        }
      });

      console.log('Provider approved successfully');
    } catch (error) {
      console.error('Error approving provider:', error);
      throw error;
    }
  },

  async rejectProvider(userId: string, reason: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', userId)
        .single();
      
      if (profileError) throw profileError;

      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Send rejection notification via edge function
      await supabase.functions.invoke('send-verification-status', {
        body: { 
          userId, 
          status: 'rejected',
          reason,
          userName: profile?.full_name,
          userEmail: profile?.email
        }
      });

      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'reject_provider',
          entityType: 'user',
          entityId: userId,
          details: { 
            reason,
            user_name: profile?.full_name || 'غير معروف'
          }
        }
      });

      console.log('Provider rejected successfully');
    } catch (error) {
      console.error('Error rejecting provider:', error);
      throw error;
    }
  },

  // Warning System
  async getUserWarnings(userId: string) {
    const { data, error } = await supabase
      .from('user_warnings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false});
    
    if (error) throw error;
    return data || [];
  },

  async adjustLoyaltyPoints(userId: string, points: number, reason: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points_balance, total_points_earned')
        .eq('user_id', userId)
        .single();

      const { error } = await supabase
        .from('loyalty_ledger')
        .insert({
          user_id: userId,
          points,
          type: points > 0 ? 'bonus' : 'deduction',
          description: reason,
        });
      
      if (error) throw error;

      // Update profile points balance
      const newBalance = (currentProfile?.points_balance || 0) + points;
      const newTotal = points > 0 
        ? (currentProfile?.total_points_earned || 0) + points 
        : currentProfile?.total_points_earned;

      await supabase
        .from('profiles')
        .update({ 
          points_balance: newBalance,
          total_points_earned: newTotal
        })
        .eq('user_id', userId);

      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'points_adjustment',
          entityType: 'user',
          entityId: userId,
          details: { points, reason, user_name: profile?.full_name || 'غير معروف' }
        }
      });
    } catch (error) {
      console.error('Error adjusting loyalty points:', error);
      throw error;
    }
  },

  async changeGroupRole(userId: string, groupId: string, newRole: 'owner' | 'admin' | 'member') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('group_id', groupId);
      
      if (error) throw error;

      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'group_role_change',
          entityType: 'group',
          entityId: groupId,
          details: { userId, newRole, user_name: profile?.full_name || 'غير معروف' }
        }
      });
    } catch (error) {
      console.error('Error changing group role:', error);
      throw error;
    }
  },

  async getUserGroups(userId: string) {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, role, joined_at, group_id, event_groups!inner(id, group_name)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      group_name: item.event_groups?.group_name || 'Unknown Group'
    }));
  },

  async getUserTransactions(userId: string) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id')
      .eq('user_id', userId)
      .limit(50);
    
    if (bookingsError) throw bookingsError;
    
    if (!bookings || bookings.length === 0) return [];
    
    const bookingIds = bookings.map(b => b.id);
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getUserBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, events!inner(id, title, title_ar, start_date)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(booking => ({
      ...booking,
      event_title: booking.events?.title || booking.events?.title_ar || 'Unknown Event'
    }));
  },

  async getUserActivityLog(userId: string) {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .eq('entity_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data || [];
  },

  async getUserGamification(userId: string) {
    const { data, error } = await supabase
      .from('loyalty_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  },
};

export const getUserWarnings = adminService.getUserWarnings;
export const adjustLoyaltyPoints = adminService.adjustLoyaltyPoints;
export const changeGroupRole = adminService.changeGroupRole;
export const getUserGroups = adminService.getUserGroups;
export const getUserTransactions = adminService.getUserTransactions;
export const getUserBookings = adminService.getUserBookings;
export const getUserActivityLog = adminService.getUserActivityLog;
export const getUserGamification = adminService.getUserGamification;

