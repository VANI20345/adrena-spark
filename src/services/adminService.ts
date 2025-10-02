import { supabase } from '@/integrations/supabase/client';

export const adminService = {
  // Statistics
  async getOverviewStats() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      { count: totalUsers },
      { count: lastMonthUsers },
      { count: totalEvents },
      { count: lastMonthEvents },
      { count: totalServices },
      { data: bookingsData },
      { data: lastMonthBookings },
      { count: totalCategories },
      { count: pendingEvents },
      { count: pendingServices }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('total_amount').eq('status', 'confirmed'),
      supabase.from('bookings').select('total_amount').eq('status', 'confirmed').gte('created_at', lastMonth.toISOString()).lt('created_at', thisMonth.toISOString()),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    const pendingReviewsCount = (pendingEvents || 0) + (pendingServices || 0);

    const totalRevenue = bookingsData?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;
    const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;

    const userGrowth = lastMonthUsers ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : '0';
    const eventGrowth = lastMonthEvents ? ((totalEvents - lastMonthEvents) / lastMonthEvents * 100).toFixed(1) : '0';
    const revenueGrowth = lastMonthRevenue ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : '0';

    return {
      totalUsers: totalUsers || 0,
      userGrowth: `${userGrowth}%`,
      totalEvents: totalEvents || 0,
      eventGrowth: `${eventGrowth}%`,
      totalServices: totalServices || 0,
      totalRevenue,
      revenueGrowth: `${revenueGrowth}%`,
      activeBookings: bookingsData?.length || 0,
      totalCategories: totalCategories || 0,
      pendingReviews: pendingReviewsCount || 0
    };
  },

  // Users Management
  async getAllUsers() {
    try {
      // Call edge function with service role access
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

  async updateUserRole(userId: string, role: 'attendee' | 'organizer' | 'provider' | 'admin') {
    // First check if role exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      if (error) throw error;
    }
  },

  async suspendUser(userId: string, reason: string, durationDays?: number) {
    const suspendedAt = new Date();
    const suspendedUntil = durationDays 
      ? new Date(suspendedAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    console.log('Attempting to suspend user:', { userId, reason, durationDays, suspendedUntil });

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        suspended: true,
        suspension_reason: reason,
        suspended_at: suspendedAt.toISOString(),
        suspended_until: suspendedUntil?.toISOString() || null,
        suspended_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('user_id', userId)
      .select();
    
    console.log('Suspension update result:', { data, error });
    
    if (error) {
      console.error('Suspension failed with error:', error);
      throw error;
    }

    // Send suspension email
    try {
      await supabase.functions.invoke('send-suspension-email', {
        body: {
          userId,
          reason,
          suspendedUntil: suspendedUntil?.toISOString() || null
        }
      });
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
      // Don't throw - suspension succeeded even if email failed
    }
    return data;
  },

  async unsuspendUser(userId: string) {
    const { error } = await supabase
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
    
    if (error) throw error;
    return data;
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
    const { error } = await supabase.rpc('delete_user_completely', {
      target_user_id: userId
    });
    if (error) throw error;
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

  async sendBulkNotification(data: { title: string; message: string; type: string; role?: 'attendee' | 'organizer' | 'provider' | 'admin' }) {
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
  }
};
