import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useTotalUsersCount } from '@/hooks/useTotalUsersCount';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Shield, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  BarChart3
} from 'lucide-react';

export const SuperAdminOverviewTab = () => {
  const { isRTL, language } = useLanguageContext();

  // Use shared hook for total users count - ensures consistency across all pages
  const { data: sharedTotalUsers = 0 } = useTotalUsersCount();

  const { data: stats, isLoading } = useSupabaseQuery({
    queryKey: ['super-admin-overview-stats-v5'],
    queryFn: async () => {
      // Get current date boundaries
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      
      // Run all queries in parallel for better performance
      const [
        adminCountResult,
        superAdminCountResult,
        pendingEventsResult,
        cancelledEventsResult,
        eventBookingsResult,
        serviceBookingsResult,
        refundsResult,
        todayEventsResult,
        recentUserActivityResult,
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('bookings').select('platform_commission, total_amount').eq('status', 'confirmed'),
        supabase.from('service_bookings').select('platform_commission, total_amount').in('status', ['confirmed', 'completed']),
        supabase.from('refunds').select('amount').eq('status', 'approved'),
        supabase.from('events').select('*', { count: 'exact', head: true })
          .gte('start_date', todayStart)
          .lte('start_date', todayEnd)
          .eq('status', 'approved'),
        supabase.from('activity_logs').select('actor_id').gte('created_at', lastHour),
      ]);

      // Calculate platform revenue (commission only, not total sales)
      const eventCommission = eventBookingsResult.data?.reduce((sum, b) => sum + (Number(b.platform_commission) || 0), 0) || 0;
      const serviceCommission = serviceBookingsResult.data?.reduce((sum, b) => sum + (Number(b.platform_commission) || 0), 0) || 0;
      const totalCommission = eventCommission + serviceCommission;
      
      // Deduct platform's commission portion of refunds (not full booking amount)
      // Each refund reduces our commission proportionally
      const totalRefundedAmount = refundsResult.data?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      // Estimate commission portion of refunds (use average commission ratio)
      const totalBookingsAmount = eventBookingsResult.data?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
      const serviceBookingsAmount = serviceBookingsResult.data?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
      const totalSalesAmount = totalBookingsAmount + serviceBookingsAmount;
      const commissionRatio = totalSalesAmount > 0 ? totalCommission / totalSalesAmount : 0;
      const refundCommissionPortion = totalRefundedAmount * commissionRatio;
      
      // Net platform revenue = total commission - commission portion of refunds
      const netPlatformRevenue = Math.max(0, totalCommission - refundCommissionPortion);
      
      // Get unique active users in last hour
      const activeUsersNow = new Set(recentUserActivityResult.data?.map(l => l.actor_id) || []).size;

      return {
        activeAdminCount: adminCountResult.count || 0,
        activeSuperAdminCount: superAdminCountResult.count || 0,
        pendingEvents: pendingEventsResult.count || 0,
        cancelledEvents: cancelledEventsResult.count || 0,
        totalRevenue: netPlatformRevenue,
        totalCommission,
        totalRefunds: refundCommissionPortion,
        todayActivities: todayEventsResult.count || 0,
        activeUsersNow,
      };
    },
  });

  const translations = {
    ar: {
      activeAdmins: 'المشرفين النشطين',
      activeAdminsDesc: 'إجمالي المشرفين في النظام',
      activeSuperAdmins: 'المشرفين الأعلى النشطين',
      activeSuperAdminsDesc: 'إجمالي المشرفين الأعلى في النظام',
      pendingEvents: 'فعاليات معلقة',
      pendingEventsDesc: 'بانتظار الموافقة',
      cancelledEvents: 'فعاليات ملغية',
      cancelledEventsDesc: 'تم إلغاؤها',
      totalRevenue: 'إيرادات المنصة',
      totalRevenueDesc: 'العمولات - المسترجعات',
      todayActivities: 'فعاليات اليوم',
      todayActivitiesDesc: 'فعاليات مجدولة اليوم',
      activeUsersNow: 'مستخدمين نشطين الآن',
      activeUsersNowDesc: 'نشط خلال آخر ساعة',
      quickSummary: 'ملخص سريع',
      quickSummaryDesc: 'نظرة سريعة على حالة النظام الحالية',
      systemStatus: 'حالة النظام',
      active: 'نشط',
      lastUpdate: 'آخر تحديث',
      quickActions: 'إجراءات سريعة',
      quickActionsDesc: 'الوصول السريع للمهام الشائعة',
      reviewEvents: 'مراجعة الفعاليات',
      manageRoles: 'إدارة الصلاحيات',
      financialReports: 'التقارير المالية',
      adminPerformance: 'أداء المشرفين',
      liveStatus: 'الحالة الحية',
      totalUsers: 'إجمالي المستخدمين',
    },
    en: {
      activeAdmins: 'Active Admins',
      activeAdminsDesc: 'Total admins in system',
      activeSuperAdmins: 'Active Super Admins',
      activeSuperAdminsDesc: 'Total super admins in system',
      pendingEvents: 'Pending Events',
      pendingEventsDesc: 'Awaiting approval',
      cancelledEvents: 'Cancelled Events',
      cancelledEventsDesc: 'Cancelled by owner or admin',
      totalRevenue: 'Platform Revenue',
      totalRevenueDesc: 'Commission - Refunds',
      todayActivities: "Today's Events",
      todayActivitiesDesc: 'Events scheduled for today',
      activeUsersNow: 'Active Users Now',
      activeUsersNowDesc: 'Active in last hour',
      quickSummary: 'Quick Summary',
      quickSummaryDesc: 'Quick overview of current system status',
      systemStatus: 'System Status',
      active: 'Active',
      lastUpdate: 'Last Update',
      quickActions: 'Quick Actions',
      quickActionsDesc: 'Quick access to common tasks',
      reviewEvents: 'Review Events',
      manageRoles: 'Permissions Management',
      financialReports: 'Financial Reports',
      adminPerformance: 'Moderator Performance',
      liveStatus: 'Live Status',
      totalUsers: 'Total Users',
    },
  };

  const t = translations[language];

  // Quick action handlers - these use a custom event to switch tabs
  const handleQuickAction = (tabId: string) => {
    // Dispatch custom event to switch tabs
    window.dispatchEvent(new CustomEvent('switch-super-admin-tab', { detail: tabId }));
  };

  const statCards = [
    {
      title: t.activeAdmins,
      description: t.activeAdminsDesc,
      value: stats?.activeAdminCount ?? 0,
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      isLive: true,
    },
    {
      title: t.activeSuperAdmins,
      description: t.activeSuperAdminsDesc,
      value: stats?.activeSuperAdminCount ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      isLive: true,
    },
    {
      title: t.pendingEvents,
      description: t.pendingEventsDesc,
      value: stats?.pendingEvents ?? 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      isLive: true,
    },
    {
      title: t.cancelledEvents,
      description: t.cancelledEventsDesc,
      value: stats?.cancelledEvents ?? 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      isLive: true,
    },
    {
      title: t.todayActivities,
      description: t.todayActivitiesDesc,
      value: stats?.todayActivities ?? 0,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      isLive: true,
    },
    {
      title: t.activeUsersNow,
      description: t.activeUsersNowDesc,
      value: stats?.activeUsersNow ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      isLive: true,
    },
    {
      title: t.totalRevenue,
      description: t.totalRevenueDesc,
      value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ${isRTL ? 'ريال' : 'SAR'}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      isLive: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Live Status Header */}
      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 animate-pulse">
          <Activity className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
          {t.liveStatus}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="relative">
            {card.isLive && (
              <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            )}
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{t.quickSummary}</CardTitle>
            <CardDescription>{t.quickSummaryDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <span className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.systemStatus}</span>
                </div>
                <span className="font-bold text-green-600">{t.active}</span>
              </div>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.totalUsers}</span>
                </div>
                <span className="font-bold text-2xl">{sharedTotalUsers}</span>
              </div>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.lastUpdate}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{t.quickActions}</CardTitle>
            <CardDescription>{t.quickActionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleQuickAction('event-activation')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors text-center`}
              >
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <span className="text-sm">{t.reviewEvents}</span>
              </button>
              <button 
                onClick={() => handleQuickAction('role-management')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors text-center`}
              >
                <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                <span className="text-sm">{t.manageRoles}</span>
              </button>
              <button 
                onClick={() => handleQuickAction('financials')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors text-center`}
              >
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <span className="text-sm">{t.financialReports}</span>
              </button>
              <button 
                onClick={() => handleQuickAction('admin-performance')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors text-center`}
              >
                <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
                <span className="text-sm">{t.adminPerformance}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};