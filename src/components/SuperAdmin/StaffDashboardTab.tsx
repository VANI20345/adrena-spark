import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { useTotalUsersCount } from '@/hooks/useTotalUsersCount';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, Briefcase, Calendar, Crown, UserCheck, PieChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const StaffDashboardTab = () => {
  const { language, isRTL } = useLanguageContext();
  const { data: sharedTotalUsers = 0 } = useTotalUsersCount();

  const { data: staffStats, isLoading } = useOptimizedQuery(
    ['super-admin-staff-stats-v3', sharedTotalUsers],
    async () => {
      // Get all role counts from user_roles table
      const [adminResult, superAdminResult, providerResult] = await Promise.all([
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
      ]);

      // Get Total Users from profiles count (shared hook useTotalUsersCount handles the edge function)
      const totalUsers = sharedTotalUsers || 0;

      // Get Event Organizers: users who created at least 1 group AND at least 1 event
      const { data: groupCreators } = await supabase
        .from('groups')
        .select('created_by');
      const groupCreatorIds = new Set(groupCreators?.map(g => g.created_by) || []);

      const { data: eventCreators } = await supabase
        .from('events')
        .select('organizer_id')
        .not('organizer_id', 'is', null);
      const eventCreatorIds = new Set(eventCreators?.map(e => e.organizer_id) || []);

      // Event Organizers = intersection of group creators and event creators
      const eventOrganizers = [...groupCreatorIds].filter(id => eventCreatorIds.has(id)).length;

      // Group Leaders: users who created at least 1 group (regardless of events)
      const groupLeaders = groupCreatorIds.size;

      const admins = adminResult.count || 0;
      const superAdmins = superAdminResult.count || 0;
      const providers = providerResult.count || 0;

      // Calculate percentages: Admins % = (admins + super_admins) / total * 100
      const adminsTotal = admins + superAdmins;
      const adminsPercentage = totalUsers > 0 ? ((adminsTotal / totalUsers) * 100).toFixed(1) : '0';
      // Users % = 100 - Admins %
      const usersPercentage = totalUsers > 0 ? (100 - parseFloat(adminsPercentage)).toFixed(1) : '0';

      return {
        admins,
        superAdmins,
        serviceProviders: providers,
        eventOrganizers,
        groupLeaders,
        totalUsers,
        adminsPercentage,
        usersPercentage,
      };
    }
  );

  const translations = {
    ar: {
      title: 'لوحة إحصائيات الموظفين',
      description: 'نظرة شاملة على جميع الموظفين وفئاتهم',
      overallTotals: 'الإجماليات الكلية',
      overallTotalsDesc: 'إجمالي الموظفين والمستخدمين منذ البداية',
      admins: 'المشرفين',
      adminsDesc: 'إجمالي مشرفي النظام',
      superAdmins: 'المشرفين الأعلى',
      superAdminsDesc: 'إجمالي المشرفين الأعلى',
      serviceProviders: 'مزودي الخدمات',
      serviceProvidersDesc: 'إجمالي مقدمي الخدمات',
      eventOrganizers: 'منظمي الفعاليات',
      eventOrganizersDesc: 'مستخدمين أنشأوا مجموعة وفعالية',
      groupLeaders: 'قادة المجموعات',
      groupLeadersDesc: 'مستخدمين أنشأوا مجموعة واحدة على الأقل',
      totalUsers: 'إجمالي المستخدمين',
      totalUsersDesc: 'جميع المستخدمين المسجلين',
      staffDistribution: 'توزيع المستخدمين',
      staffDistributionDesc: 'نسبة المستخدمين والمشرفين من الإجمالي',
      adminsPercentage: 'نسبة المشرفين',
      usersPercentage: 'نسبة المستخدمين',
      overall: 'إجمالي',
    },
    en: {
      title: 'Staff Dashboard',
      description: 'Comprehensive overview of all staff and their categories',
      overallTotals: 'Overall Totals',
      overallTotalsDesc: 'Total staff and users since beginning',
      admins: 'Admins',
      adminsDesc: 'Total system administrators',
      superAdmins: 'Super Admins',
      superAdminsDesc: 'Total super administrators',
      serviceProviders: 'Service Providers',
      serviceProvidersDesc: 'Total service providers',
      eventOrganizers: 'Event Organizers',
      eventOrganizersDesc: 'Users who created a group and an event',
      groupLeaders: 'Group Leaders',
      groupLeadersDesc: 'Users who created at least one group',
      totalUsers: 'Total Users',
      totalUsersDesc: 'All registered users',
      staffDistribution: 'User Distribution',
      staffDistributionDesc: 'Percentage of users and admins from total',
      adminsPercentage: 'Admins Percentage',
      usersPercentage: 'Users Percentage',
      overall: 'Overall',
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
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
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

      {/* Staff Distribution - Users % and Admins % only */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <PieChart className="h-5 w-5 text-primary" />
            {t.staffDistribution}
          </CardTitle>
          <CardDescription>{t.staffDistributionDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-6 border rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Users className="h-5 w-5 text-cyan-600" />
                <p className="text-sm text-muted-foreground font-medium">{t.usersPercentage}</p>
              </div>
              <p className="text-4xl font-bold text-cyan-600">{staffStats?.usersPercentage || 0}%</p>
            </div>
            <div className={`p-6 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Shield className="h-5 w-5 text-purple-600" />
                <p className="text-sm text-muted-foreground font-medium">{t.adminsPercentage}</p>
              </div>
              <p className="text-4xl font-bold text-purple-600">{staffStats?.adminsPercentage || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboardTab;