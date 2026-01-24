import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Briefcase, Calendar, TrendingUp, Crown, UserCheck, Activity, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const StaffDashboardTab = () => {
  const { language, isRTL } = useLanguageContext();

  const { data: staffStats, isLoading } = useOptimizedQuery(
    ['super-admin-staff-stats'],
    async () => {
      // Get current date boundaries
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Get all role counts from user_roles table (OVERALL TOTAL)
      const [adminResult, superAdminResult, providerResult, totalUsersResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin'),
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'super_admin'),
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
      ]);

      // Get unique event organizers (OVERALL TOTAL)
      const { data: organizers } = await supabase
        .from('events')
        .select('organizer_id')
        .not('organizer_id', 'is', null);

      const uniqueOrganizers = new Set(organizers?.map(o => o.organizer_id) || []).size;

      // Get group leaders (OVERALL TOTAL)
      const { data: groupLeaders } = await supabase
        .from('group_memberships')
        .select('user_id, role')
        .in('role', ['owner', 'admin']);

      const uniqueGroupLeaders = new Set(groupLeaders?.map(gl => gl.user_id) || []).size;
      const groupOwners = groupLeaders?.filter(gl => gl.role === 'owner').length || 0;
      const groupAdmins = groupLeaders?.filter(gl => gl.role === 'admin').length || 0;

      // Active admins (based on last_activity, not admin_activity_logs)
      const { data: adminAndSuperRoles, error: adminRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (adminRolesError) console.error('Error fetching admin roles:', adminRolesError);
      const adminUserIds = (adminAndSuperRoles || []).map((r) => r.user_id);

      const [activeAdminsThisMonthRes, activeAdminsNowRes] = await Promise.all([
        adminUserIds.length
          ? supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .in('user_id', adminUserIds)
              .gte('last_activity', thirtyDaysAgo)
          : Promise.resolve({ count: 0 } as any),
        adminUserIds.length
          ? supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .in('user_id', adminUserIds)
              .gte('last_activity', last24Hours)
          : Promise.resolve({ count: 0 } as any),
      ]);

      const activeAdminsThisMonth = activeAdminsThisMonthRes.count || 0;
      const activeAdminsNow = activeAdminsNowRes.count || 0;

      // Get new users this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth);

      // Get new providers this month
      const { count: newProvidersThisMonth } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'provider')
        .gte('created_at', startOfMonth);

      const totalUsers = totalUsersResult.count || 0;
      const admins = adminResult.count || 0;
      const superAdmins = superAdminResult.count || 0;
      const providers = providerResult.count || 0;
      const totalStaff = admins + superAdmins + providers;

      return {
        // Overall totals
        admins,
        superAdmins,
        serviceProviders: providers,
        eventOrganizers: uniqueOrganizers,
        groupLeaders: uniqueGroupLeaders,
        groupOwners,
        groupAdmins,
        totalStaff,
        totalUsers,
        // This month metrics
        activeAdminsThisMonth,
        activeAdminsNow,
        newUsersThisMonth: newUsersThisMonth || 0,
        newProvidersThisMonth: newProvidersThisMonth || 0,
        // Percentages
        adminPercentage: totalUsers > 0 ? ((admins + superAdmins) / totalUsers * 100).toFixed(1) : '0',
        staffPercentage: totalUsers > 0 ? (totalStaff / totalUsers * 100).toFixed(1) : '0',
      };
    }
  );

  const translations = {
    ar: {
      title: 'لوحة إحصائيات الموظفين',
      description: 'نظرة شاملة على جميع الموظفين وفئاتهم',
      overallTotals: 'الإجماليات الكلية',
      overallTotalsDesc: 'إجمالي الموظفين والمستخدمين منذ البداية',
      thisMonthActivity: 'نشاط هذا الشهر',
      thisMonthActivityDesc: 'النشاط والإضافات خلال الـ 30 يوم الماضية',
      liveStatus: 'الحالة الحية',
      liveStatusDesc: 'الوضع الحالي في آخر 24 ساعة',
      admins: 'المشرفين',
      adminsDesc: 'إجمالي مشرفي النظام',
      superAdmins: 'المشرفين الأعلى',
      superAdminsDesc: 'إجمالي المشرفين الأعلى',
      serviceProviders: 'مزودي الخدمات',
      serviceProvidersDesc: 'إجمالي مقدمي الخدمات',
      eventOrganizers: 'منظمي الفعاليات',
      eventOrganizersDesc: 'إجمالي منظمي الفعاليات',
      groupLeaders: 'قادة المجموعات',
      groupLeadersDesc: 'إجمالي مالكي ومشرفي المجموعات',
      totalStaff: 'إجمالي الموظفين',
      totalStaffDesc: 'جميع الموظفين والمزودين',
      totalUsers: 'إجمالي المستخدمين',
      totalUsersDesc: 'جميع المستخدمين المسجلين',
      activeAdminsMonth: 'مشرفين نشطين هذا الشهر',
      activeAdminsMonthDesc: 'مشرفين لديهم نشاط في آخر 30 يوم',
      activeAdminsNow: 'مشرفين نشطين الآن',
      activeAdminsNowDesc: 'نشط خلال آخر 24 ساعة',
      newUsersMonth: 'مستخدمين جدد هذا الشهر',
      newUsersMonthDesc: 'تسجيلات جديدة هذا الشهر',
      newProvidersMonth: 'مزودين جدد هذا الشهر',
      newProvidersMonthDesc: 'مقدمي خدمات جدد هذا الشهر',
      staffBreakdown: 'توزيع الموظفين',
      staffBreakdownDesc: 'توزيع الموظفين حسب الفئة (إجمالي كلي)',
      percentages: 'النسب المئوية',
      percentagesDesc: 'نسبة الموظفين من إجمالي المستخدمين',
      adminPercentage: 'نسبة المشرفين',
      staffPercentage: 'نسبة الموظفين',
      groupOwners: 'مالكي المجموعات',
      groupAdmins: 'مشرفي المجموعات',
      overall: 'إجمالي',
      thisMonth: 'هذا الشهر',
      live: 'مباشر',
    },
    en: {
      title: 'Staff Dashboard',
      description: 'Comprehensive overview of all staff and their categories',
      overallTotals: 'Overall Totals',
      overallTotalsDesc: 'Total staff and users since beginning',
      thisMonthActivity: 'This Month Activity',
      thisMonthActivityDesc: 'Activity and additions in last 30 days',
      liveStatus: 'Live Status',
      liveStatusDesc: 'Current status in last 24 hours',
      admins: 'Admins',
      adminsDesc: 'Total system administrators',
      superAdmins: 'Super Admins',
      superAdminsDesc: 'Total super administrators',
      serviceProviders: 'Service Providers',
      serviceProvidersDesc: 'Total service providers',
      eventOrganizers: 'Event Organizers',
      eventOrganizersDesc: 'Total event organizers',
      groupLeaders: 'Group Leaders',
      groupLeadersDesc: 'Total group owners and admins',
      totalStaff: 'Total Staff',
      totalStaffDesc: 'All staff and providers',
      totalUsers: 'Total Users',
      totalUsersDesc: 'All registered users',
      activeAdminsMonth: 'Active Admins This Month',
      activeAdminsMonthDesc: 'Admins with activity in last 30 days',
      activeAdminsNow: 'Active Admins Now',
      activeAdminsNowDesc: 'Active in last 24 hours',
      newUsersMonth: 'New Users This Month',
      newUsersMonthDesc: 'New registrations this month',
      newProvidersMonth: 'New Providers This Month',
      newProvidersMonthDesc: 'New service providers this month',
      staffBreakdown: 'Staff Breakdown',
      staffBreakdownDesc: 'Staff distribution by category (overall total)',
      percentages: 'Percentages',
      percentagesDesc: 'Staff percentage of total users',
      adminPercentage: 'Admin Percentage',
      staffPercentage: 'Staff Percentage',
      groupOwners: 'Group Owners',
      groupAdmins: 'Group Admins',
      overall: 'Overall',
      thisMonth: 'This Month',
      live: 'Live',
    },
  };

  const t = translations[language];

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {/* Overall Totals Section */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <Badge variant="secondary">{t.overall}</Badge>
            <CardTitle>{t.overallTotals}</CardTitle>
          </div>
          <CardDescription>{t.overallTotalsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className={`p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Crown className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">{t.superAdmins}</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{staffStats?.superAdmins || 0}</p>
              <p className="text-xs text-muted-foreground">{t.superAdminsDesc}</p>
            </div>
            <div className={`p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">{t.admins}</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{staffStats?.admins || 0}</p>
              <p className="text-xs text-muted-foreground">{t.adminsDesc}</p>
            </div>
            <div className={`p-4 bg-green-50 dark:bg-green-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Briefcase className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">{t.serviceProviders}</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{staffStats?.serviceProviders || 0}</p>
              <p className="text-xs text-muted-foreground">{t.serviceProvidersDesc}</p>
            </div>
            <div className={`p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">{t.eventOrganizers}</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{staffStats?.eventOrganizers || 0}</p>
              <p className="text-xs text-muted-foreground">{t.eventOrganizersDesc}</p>
            </div>
            <div className={`p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <UserCheck className="h-5 w-5 text-pink-600" />
                <span className="text-sm font-medium">{t.groupLeaders}</span>
              </div>
              <p className="text-2xl font-bold text-pink-600">{staffStats?.groupLeaders || 0}</p>
              <p className="text-xs text-muted-foreground">{t.groupLeadersDesc}</p>
            </div>
            <div className={`p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Users className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-medium">{t.totalUsers}</span>
              </div>
              <p className="text-2xl font-bold text-cyan-600">{staffStats?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">{t.totalUsersDesc}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Month + Live Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This Month Activity */}
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                <Clock className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t.thisMonth}
              </Badge>
              <CardTitle className="text-lg">{t.thisMonthActivity}</CardTitle>
            </div>
            <CardDescription>{t.thisMonthActivityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <span className="font-medium">{t.activeAdminsMonth}</span>
                  <p className="text-xs text-muted-foreground">{t.activeAdminsMonthDesc}</p>
                </div>
              </div>
              <span className="font-bold text-emerald-600 text-xl">{staffStats?.activeAdminsThisMonth || 0}</span>
            </div>
            <div className={`flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="h-5 w-5 text-blue-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <span className="font-medium">{t.newUsersMonth}</span>
                  <p className="text-xs text-muted-foreground">{t.newUsersMonthDesc}</p>
                </div>
              </div>
              <span className="font-bold text-blue-600 text-xl">{staffStats?.newUsersThisMonth || 0}</span>
            </div>
            <div className={`flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Briefcase className="h-5 w-5 text-green-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <span className="font-medium">{t.newProvidersMonth}</span>
                  <p className="text-xs text-muted-foreground">{t.newProvidersMonthDesc}</p>
                </div>
              </div>
              <span className="font-bold text-green-600 text-xl">{staffStats?.newProvidersThisMonth || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Status */}
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 animate-pulse">
                <Activity className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t.live}
              </Badge>
              <CardTitle className="text-lg">{t.liveStatus}</CardTitle>
            </div>
            <CardDescription>{t.liveStatusDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Activity className="h-5 w-5 text-orange-600" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <span className="font-medium">{t.activeAdminsNow}</span>
                  <p className="text-xs text-muted-foreground">{t.activeAdminsNowDesc}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="font-bold text-orange-600 text-xl">{staffStats?.activeAdminsNow || 0}</span>
              </div>
            </div>
            
            {/* Percentages Section */}
            <div className={`p-4 bg-muted rounded-lg space-y-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h4 className="font-medium">{t.percentages}</h4>
              <p className="text-xs text-muted-foreground">{t.percentagesDesc}</p>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm">{t.adminPercentage}</span>
                <span className="font-bold">{staffStats?.adminPercentage || 0}%</span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm">{t.staffPercentage}</span>
                <span className="font-bold">{staffStats?.staffPercentage || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboardTab;