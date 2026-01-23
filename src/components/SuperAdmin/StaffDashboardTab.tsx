import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Briefcase, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const StaffDashboardTab = () => {
  const { language, isRTL } = useLanguageContext();

  const { data: staffStats, isLoading } = useOptimizedQuery(
    ['super-admin-staff-stats'],
    async () => {
      // Get all role counts
      const [adminResult, providerResult, organizerResult, totalResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin'),
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider'),
        // Event organizers are providers who have created events
        supabase
          .from('events')
          .select('organizer_id', { count: 'exact', head: true })
          .not('organizer_id', 'is', null),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
      ]);

      // Get unique event organizers count
      const { data: organizers } = await supabase
        .from('events')
        .select('organizer_id')
        .not('organizer_id', 'is', null);

      const uniqueOrganizers = new Set(organizers?.map(o => o.organizer_id) || []).size;

      // Get staff activity stats (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentActivity } = await supabase
        .from('admin_activity_logs')
        .select('admin_id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo);

      const activeAdmins = new Set(recentActivity?.map(a => a.admin_id) || []).size;

      return {
        admins: adminResult.count || 0,
        serviceProviders: providerResult.count || 0,
        eventProviders: uniqueOrganizers,
        totalStaff: (adminResult.count || 0) + (providerResult.count || 0),
        totalUsers: totalResult.count || 0,
        activeAdmins,
      };
    }
  );

  const translations = {
    ar: {
      title: 'لوحة إحصائيات الموظفين',
      description: 'نظرة شاملة على جميع الموظفين وفئاتهم',
      admins: 'المشرفين',
      adminsDesc: 'مشرفي النظام النشطين',
      serviceProviders: 'مزودي الخدمات',
      serviceProvidersDesc: 'مقدمي الخدمات المسجلين',
      eventProviders: 'منظمي الفعاليات',
      eventProvidersDesc: 'منظمي الفعاليات النشطين',
      totalStaff: 'إجمالي الموظفين',
      totalStaffDesc: 'جميع الموظفين والمزودين',
      totalUsers: 'إجمالي المستخدمين',
      totalUsersDesc: 'جميع المستخدمين المسجلين',
      activeAdmins: 'مشرفين نشطين',
      activeAdminsDesc: 'نشط خلال 30 يوم',
      staffBreakdown: 'توزيع الموظفين',
      recentActivity: 'النشاط الأخير',
    },
    en: {
      title: 'Staff Dashboard',
      description: 'Comprehensive overview of all staff and their categories',
      admins: 'Admins',
      adminsDesc: 'Active system administrators',
      serviceProviders: 'Service Providers',
      serviceProvidersDesc: 'Registered service providers',
      eventProviders: 'Event Organizers',
      eventProvidersDesc: 'Active event organizers',
      totalStaff: 'Total Staff',
      totalStaffDesc: 'All staff and providers',
      totalUsers: 'Total Users',
      totalUsersDesc: 'All registered users',
      activeAdmins: 'Active Admins',
      activeAdminsDesc: 'Active in last 30 days',
      staffBreakdown: 'Staff Breakdown',
      recentActivity: 'Recent Activity',
    },
  };

  const t = translations[language];

  const statCards = [
    {
      title: t.admins,
      description: t.adminsDesc,
      value: staffStats?.admins || 0,
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: t.serviceProviders,
      description: t.serviceProvidersDesc,
      value: staffStats?.serviceProviders || 0,
      icon: Briefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: t.eventProviders,
      description: t.eventProvidersDesc,
      value: staffStats?.eventProviders || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: t.totalStaff,
      description: t.totalStaffDesc,
      value: staffStats?.totalStaff || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: t.activeAdmins,
      description: t.activeAdminsDesc,
      value: staffStats?.activeAdmins || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
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

      {/* Staff Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.staffBreakdown}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'توزيع الموظفين حسب الفئة' : 'Staff distribution by category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span>{t.admins}</span>
                </div>
                <span className="font-bold text-blue-600">{staffStats?.admins || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <span>{t.serviceProviders}</span>
                </div>
                <span className="font-bold text-green-600">{staffStats?.serviceProviders || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span>{t.eventProviders}</span>
                </div>
                <span className="font-bold text-purple-600">{staffStats?.eventProviders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.recentActivity}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'إحصائيات النشاط الأخير' : 'Recent activity statistics'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</span>
                <span className="font-bold">{staffStats?.totalUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>{language === 'ar' ? 'إجمالي الموظفين' : 'Total Staff'}</span>
                <span className="font-bold">{staffStats?.totalStaff || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>{language === 'ar' ? 'نسبة الموظفين' : 'Staff Ratio'}</span>
                <span className="font-bold">
                  {staffStats?.totalUsers 
                    ? ((staffStats.totalStaff / staffStats.totalUsers) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboardTab;
