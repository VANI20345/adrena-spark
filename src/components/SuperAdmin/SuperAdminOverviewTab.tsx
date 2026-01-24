import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
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
  AlertCircle
} from 'lucide-react';

type SuperAdminTabId =
  | 'event-activation'
  | 'role-management'
  | 'financials'
  | 'admin-performance';

interface SuperAdminOverviewTabProps {
  onSelectTab?: (tabId: SuperAdminTabId) => void;
}

export const SuperAdminOverviewTab: React.FC<SuperAdminOverviewTabProps> = ({ onSelectTab }) => {
  const { isRTL, language } = useLanguageContext();

  const { data: stats, isLoading } = useSupabaseQuery({
    queryKey: ['super-admin-overview-stats'],
    queryFn: async () => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayISO = startOfToday.toISOString();

      const pendingEventStatuses = ['pending'];
      const cancelledEventStatuses = ['cancelled', 'canceled', 'rejected'];
      const revenueBookingStatuses = ['pending', 'confirmed', 'completed'];

      const [
        activeAdminLogsRes,
        adminRolesRes,
        pendingEventsRes,
        cancelledEventsRes,
        bookingsRes,
        todayActivitiesRes,
        recentActivityLogsRes,
      ] = await Promise.all([
        supabase.from('admin_activity_logs').select('admin_id').gte('created_at', last24Hours),
        supabase.from('user_roles').select('user_id, role').in('role', ['admin', 'super_admin']),
        supabase.from('events').select('*', { count: 'exact', head: true }).in('status', pendingEventStatuses),
        supabase.from('events').select('*', { count: 'exact', head: true }).in('status', cancelledEventStatuses),
        supabase.from('bookings').select('total_amount, status').in('status', revenueBookingStatuses),
        supabase.from('admin_activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfTodayISO),
        supabase.from('activity_logs').select('actor_id').gte('created_at', lastHour),
      ]);

      if (activeAdminLogsRes.error) console.error('Error fetching admin activity logs:', activeAdminLogsRes.error);
      if (adminRolesRes.error) console.error('Error fetching admin roles:', adminRolesRes.error);
      if (pendingEventsRes.error) console.error('Error fetching pending events:', pendingEventsRes.error);
      if (cancelledEventsRes.error) console.error('Error fetching cancelled events:', cancelledEventsRes.error);
      if (bookingsRes.error) console.error('Error fetching bookings:', bookingsRes.error);
      if (todayActivitiesRes.error) console.error('Error fetching today activities:', todayActivitiesRes.error);
      if (recentActivityLogsRes.error) console.error('Error fetching recent activity logs:', recentActivityLogsRes.error);

      const activeAdminIds = new Set((activeAdminLogsRes.data || []).map((l) => l.admin_id));
      const adminRoles = adminRolesRes.data || [];

      const activeAdminCount = adminRoles.filter((r) => r.role === 'admin' && activeAdminIds.has(r.user_id)).length;
      const activeSuperAdminCount = adminRoles.filter((r) => r.role === 'super_admin' && activeAdminIds.has(r.user_id)).length;

      const totalRevenue = (bookingsRes.data || []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const todayActivities = todayActivitiesRes.count || 0;
      const activeUsersNow = new Set((recentActivityLogsRes.data || []).map((l) => l.actor_id)).size;

      return {
        activeAdminCount,
        activeSuperAdminCount,
        pendingEvents: pendingEventsRes.count || 0,
        suspendedEvents: cancelledEventsRes.count || 0,
        totalRevenue,
        todayActivities,
        activeUsersNow,
      };
    },
  });

  const translations = {
    ar: {
      activeAdmins: 'مشرفين نشطين حالياً',
      activeAdminsDesc: 'نشط خلال آخر 24 ساعة',
      activeSuperAdmins: 'مشرفين أعلى نشطين',
      activeSuperAdminsDesc: 'نشط خلال آخر 24 ساعة',
      pendingEvents: 'فعاليات معلقة الآن',
      pendingEventsDesc: 'بانتظار المراجعة',
      suspendedEvents: 'فعاليات ملغية',
      suspendedEventsDesc: 'تم إلغاؤها أو رفضها',
      totalRevenue: 'إجمالي الإيرادات',
      totalRevenueDesc: 'المجموع الكلي',
      todayActivities: 'أنشطة اليوم',
      todayActivitiesDesc: 'إجراءات إدارية اليوم',
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
    },
    en: {
      activeAdmins: 'Active Admins Now',
      activeAdminsDesc: 'Active in last 24 hours',
      activeSuperAdmins: 'Active Super Admins',
      activeSuperAdminsDesc: 'Active in last 24 hours',
      pendingEvents: 'Pending Events Now',
      pendingEventsDesc: 'Awaiting review',
      suspendedEvents: 'Suspended Events',
      suspendedEventsDesc: 'Cancelled or rejected',
      totalRevenue: 'Total Revenue',
      totalRevenueDesc: 'All time total',
      todayActivities: "Today's Activities",
      todayActivitiesDesc: 'Admin actions today',
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
      manageRoles: 'Manage Roles',
      financialReports: 'Financial Reports',
      adminPerformance: 'Admin Performance',
      liveStatus: 'Live Status',
    },
  };

  const t = translations[language];

  const handleQuickAction = (tabId: SuperAdminTabId) => {
    onSelectTab?.(tabId);
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
      title: t.suspendedEvents,
      description: t.suspendedEventsDesc,
      value: stats?.suspendedEvents ?? 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      isLive: true,
    },
    {
      title: t.todayActivities,
      description: t.todayActivitiesDesc,
      value: stats?.todayActivities ?? 0,
      icon: Activity,
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
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{t.systemStatus}</span>
                <span className={`flex items-center gap-2 text-green-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  {t.active}
                </span>
              </div>
              <div className={`flex items-center justify-between p-3 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{t.lastUpdate}</span>
                <span className="text-muted-foreground">
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
                type="button"
                onClick={() => handleQuickAction('event-activation')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors ${isRTL ? 'text-right' : 'text-center'}`}
              >
                <Calendar className={`h-6 w-6 text-primary ${isRTL ? '' : 'mx-auto'} mb-2`} />
                <span className="text-sm">{t.reviewEvents}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('role-management')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors ${isRTL ? 'text-right' : 'text-center'}`}
              >
                <Shield className={`h-6 w-6 text-primary ${isRTL ? '' : 'mx-auto'} mb-2`} />
                <span className="text-sm">{t.manageRoles}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('financials')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors ${isRTL ? 'text-right' : 'text-center'}`}
              >
                <DollarSign className={`h-6 w-6 text-primary ${isRTL ? '' : 'mx-auto'} mb-2`} />
                <span className="text-sm">{t.financialReports}</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('admin-performance')}
                className={`p-4 border rounded-lg hover:bg-muted transition-colors ${isRTL ? 'text-right' : 'text-center'}`}
              >
                <Users className={`h-6 w-6 text-primary ${isRTL ? '' : 'mx-auto'} mb-2`} />
                <span className="text-sm">{t.adminPerformance}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};