import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  User, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Activity,
  TrendingUp,
  Clock,
  Shield,
  AlertCircle,
  RefreshCw,
  Calendar,
  CalendarDays,
  History
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

interface AdminData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  account_created: string | null;
}

interface PeriodStats {
  eventsApproved: number;
  eventsRejected: number;
  servicesApproved: number;
  servicesRejected: number;
  providersApproved: number;
  providersRejected: number;
  ticketsResolved: number;
  reportsHandled: number;
  roleUpdates: number;
  totalActions: number;
  lastActive: string | null;
}

interface AdminPerformance {
  admin: AdminData;
  sinceCreation: PeriodStats;
  lastWeek: PeriodStats;
  lastMonth: PeriodStats;
}

export const AdminPerformanceTab = () => {
  const { isRTL, language } = useLanguageContext();
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<'sinceCreation' | 'lastWeek' | 'lastMonth'>('lastMonth');

  const { data: performanceData = [], isLoading, error, refetch } = useSupabaseQuery({
    queryKey: ['admin-performance-all-periods'],
    queryFn: async (): Promise<AdminPerformance[]> => {
      try {
        // Get all admins AND super_admins from user_roles
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'super_admin']);

        if (rolesError) {
          console.error('Error fetching admin roles:', rolesError);
          throw rolesError;
        }
        
        if (!adminRoles || adminRoles.length === 0) return [];

        const adminIds = adminRoles.map(r => r.user_id);

        // Get admin profiles with account creation date
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, created_at')
          .in('user_id', adminIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Calculate date boundaries
        const now = new Date();
        const oneWeekAgo = subDays(now, 7).toISOString();
        const oneMonthAgo = subMonths(now, 1).toISOString();

        // Get ALL activity logs for these admins (no time filter - we'll filter in JS)
        const { data: logs, error: logsError } = await supabase
          .from('admin_activity_logs')
          .select('admin_id, action, entity_type, details, created_at')
          .in('admin_id', adminIds)
          .order('created_at', { ascending: false });

        if (logsError) {
          console.error('Error fetching logs:', logsError);
          throw logsError;
        }

        // Helper function to calculate stats for a period
        const calculatePeriodStats = (adminLogs: typeof logs, startDate: string | null): PeriodStats => {
          const filteredLogs = startDate 
            ? (adminLogs || []).filter(l => l.created_at >= startDate)
            : (adminLogs || []);
          
          return {
            eventsApproved: filteredLogs.filter(l => l.action === 'approve_event').length,
            eventsRejected: filteredLogs.filter(l => l.action === 'reject_event').length,
            servicesApproved: filteredLogs.filter(l => l.action === 'approve_service').length,
            servicesRejected: filteredLogs.filter(l => l.action === 'reject_service').length,
            providersApproved: filteredLogs.filter(l => l.action === 'approve_provider').length,
            providersRejected: filteredLogs.filter(l => l.action === 'reject_provider').length,
            ticketsResolved: filteredLogs.filter(l => l.action?.includes('ticket') || l.action?.includes('resolve')).length,
            reportsHandled: filteredLogs.filter(l => l.action?.includes('report')).length,
            roleUpdates: filteredLogs.filter(l => l.action === 'role_update' || l.action === 'update_user_role').length,
            totalActions: filteredLogs.length,
            lastActive: filteredLogs.length > 0 ? filteredLogs[0].created_at : null,
          };
        };

        // Build performance data for each admin
        const performance: AdminPerformance[] = adminIds.map(adminId => {
          const profile = (profiles || []).find(p => p.user_id === adminId);
          const roleInfo = adminRoles.find(r => r.user_id === adminId);
          const adminLogs = (logs || []).filter(l => l.admin_id === adminId);
          
          const adminData: AdminData = {
            user_id: adminId,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            role: roleInfo?.role || 'admin',
            account_created: profile?.created_at || null,
          };

          return {
            admin: adminData,
            sinceCreation: calculatePeriodStats(adminLogs, null), // No filter = all time
            lastWeek: calculatePeriodStats(adminLogs, oneWeekAgo),
            lastMonth: calculatePeriodStats(adminLogs, oneMonthAgo),
          };
        });

        // Sort by total actions (all time) descending
        return performance.sort((a, b) => b.sinceCreation.totalActions - a.sinceCreation.totalActions);
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
  });

  const translations = {
    ar: {
      title: 'أداء المشرفين',
      description: 'مراقبة وتتبع أداء جميع مشرفي النظام',
      sinceCreation: 'منذ إنشاء الحساب',
      lastWeek: 'آخر أسبوع',
      lastMonth: 'آخر شهر',
      noAdmins: 'لا يوجد مشرفين',
      noAdminsDesc: 'لم يتم تعيين أي مشرفين بعد',
      unknownAdmin: 'مشرف غير معروف',
      actions: 'إجراء',
      statistics: 'الإحصائيات',
      activityLog: 'سجل النشاط',
      eventsApproved: 'فعاليات موافق عليها',
      eventsRejected: 'فعاليات مرفوضة',
      servicesApproved: 'خدمات موافق عليها',
      servicesRejected: 'خدمات مرفوضة',
      providersApproved: 'مقدمي خدمات موافق عليهم',
      providersRejected: 'مقدمي خدمات مرفوضين',
      ticketsResolved: 'تذاكر تم حلها',
      reportsHandled: 'بلاغات تم معالجتها',
      roleUpdates: 'تحديثات الأدوار',
      totalActions: 'إجمالي الإجراءات',
      performanceDetails: 'تفاصيل الأداء',
      comprehensiveBreakdown: 'تفصيل شامل لجميع الإجراءات المتخذة',
      noActivityLogs: 'لا توجد سجلات نشاط',
      lastActive: 'آخر نشاط',
      admin: 'مشرف',
      superAdmin: 'مشرف عام',
      refresh: 'تحديث',
      approved: 'موافقات',
      rejected: 'رفض',
      tickets: 'تذاكر',
      accountCreated: 'تاريخ الإنشاء',
      noActivity: 'لا يوجد نشاط',
      selectPeriod: 'اختر الفترة',
      allAdmins: 'جميع المشرفين',
      totalAdmins: 'إجمالي المشرفين',
    },
    en: {
      title: 'Admin Performance',
      description: 'Monitor and track performance of all system administrators',
      sinceCreation: 'Since Account Creation',
      lastWeek: 'Last Week',
      lastMonth: 'Last Month',
      noAdmins: 'No Admins Found',
      noAdminsDesc: 'No admins have been assigned yet',
      unknownAdmin: 'Unknown Admin',
      actions: 'actions',
      statistics: 'Statistics',
      activityLog: 'Activity Log',
      eventsApproved: 'Events Approved',
      eventsRejected: 'Events Rejected',
      servicesApproved: 'Services Approved',
      servicesRejected: 'Services Rejected',
      providersApproved: 'Providers Approved',
      providersRejected: 'Providers Rejected',
      ticketsResolved: 'Tickets Resolved',
      reportsHandled: 'Reports Handled',
      roleUpdates: 'Role Updates',
      totalActions: 'Total Actions',
      performanceDetails: 'Performance Details',
      comprehensiveBreakdown: 'Comprehensive breakdown of all actions taken',
      noActivityLogs: 'No activity logs found',
      lastActive: 'Last Active',
      admin: 'Admin',
      superAdmin: 'Super Admin',
      refresh: 'Refresh',
      approved: 'Approved',
      rejected: 'Rejected',
      tickets: 'Tickets',
      accountCreated: 'Account Created',
      noActivity: 'No Activity',
      selectPeriod: 'Select Period',
      allAdmins: 'All Admins',
      totalAdmins: 'Total Admins',
    },
  };

  const t = translations[language];

  const selectedAdminData = selectedAdmin 
    ? performanceData.find(p => p.admin.user_id === selectedAdmin) 
    : null;

  const getActiveStats = (perf: AdminPerformance): PeriodStats => {
    switch (activePeriod) {
      case 'sinceCreation': return perf.sinceCreation;
      case 'lastWeek': return perf.lastWeek;
      case 'lastMonth': return perf.lastMonth;
      default: return perf.lastMonth;
    }
  };

  const getPeriodLabel = () => {
    switch (activePeriod) {
      case 'sinceCreation': return t.sinceCreation;
      case 'lastWeek': return t.lastWeek;
      case 'lastMonth': return t.lastMonth;
      default: return t.lastMonth;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className={`pt-6 text-center py-12 ${isRTL ? 'text-right' : 'text-left'}`}>
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'حدث خطأ' : 'An Error Occurred'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لم نتمكن من تحميل بيانات الأداء' : 'Unable to load performance data'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <BarChart3 className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Badge variant="outline" className="text-sm">
            {t.totalAdmins}: {performanceData.length}
          </Badge>
          <Button variant="outline" size="icon" onClick={() => refetch()} title={t.refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Period Selection Tabs */}
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="pt-6">
          <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as typeof activePeriod)} dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className="grid w-full grid-cols-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <TabsTrigger value="sinceCreation" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <History className="h-4 w-4" />
                <span>{t.sinceCreation}</span>
              </TabsTrigger>
              <TabsTrigger value="lastWeek" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>{t.lastWeek}</span>
              </TabsTrigger>
              <TabsTrigger value="lastMonth" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CalendarDays className="h-4 w-4" />
                <span>{t.lastMonth}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Admin Cards Grid */}
      {performanceData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {performanceData.map((perf) => {
            const stats = getActiveStats(perf);
            const totalApproved = stats.eventsApproved + stats.servicesApproved + stats.providersApproved;
            const totalRejected = stats.eventsRejected + stats.servicesRejected + stats.providersRejected;
            
            return (
              <Card 
                key={perf.admin.user_id} 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedAdmin === perf.admin.user_id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedAdmin(perf.admin.user_id === selectedAdmin ? null : perf.admin.user_id)}
              >
                <CardContent className="pt-6">
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {perf.admin.avatar_url ? (
                        <img src={perf.admin.avatar_url} alt={perf.admin.full_name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-semibold">{perf.admin.full_name || t.unknownAdmin}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stats.totalActions} {t.actions} ({getPeriodLabel()})
                      </p>
                      {perf.admin.account_created && (
                        <p className={`text-xs text-muted-foreground flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <Clock className="h-3 w-3" />
                          {t.accountCreated}: {format(new Date(perf.admin.account_created), isRTL ? 'dd/MM/yyyy' : 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={perf.admin.role === 'super_admin' ? 'default' : 'secondary'} 
                      className={`${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Shield className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      {perf.admin.role === 'super_admin' ? t.superAdmin : t.admin}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                      <p className="text-lg font-bold text-green-600">{totalApproved}</p>
                      <p className="text-xs text-muted-foreground">{t.approved}</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                      <p className="text-lg font-bold text-red-600">{totalRejected}</p>
                      <p className="text-xs text-muted-foreground">{t.rejected}</p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                      <p className="text-lg font-bold text-blue-600">{stats.ticketsResolved + stats.reportsHandled}</p>
                      <p className="text-xs text-muted-foreground">{t.tickets}</p>
                    </div>
                  </div>

                  {stats.lastActive && (
                    <p className={`text-xs text-muted-foreground mt-3 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      <Activity className="h-3 w-3" />
                      {t.lastActive}: {format(new Date(stats.lastActive), isRTL ? 'dd/MM/yyyy HH:mm' : 'MMM dd, HH:mm')}
                    </p>
                  )}
                  {!stats.lastActive && stats.totalActions === 0 && (
                    <p className={`text-xs text-muted-foreground mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.noActivity}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className={`pt-6 text-center py-12 ${isRTL ? 'text-right' : ''}`}>
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t.noAdmins}</h3>
            <p className="text-muted-foreground">{t.noAdminsDesc}</p>
          </CardContent>
        </Card>
      )}

      {/* Selected Admin Detailed Statistics */}
      {selectedAdminData && (
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="h-5 w-5" />
              {t.performanceDetails} - {selectedAdminData.admin.full_name || t.unknownAdmin}
            </CardTitle>
            <CardDescription>{t.comprehensiveBreakdown}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Three Period Comparison Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المقياس' : 'Metric'}</TableHead>
                    <TableHead className="text-center">{t.lastWeek}</TableHead>
                    <TableHead className="text-center">{t.lastMonth}</TableHead>
                    <TableHead className="text-center">{t.sinceCreation}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {t.eventsApproved}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.eventsApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.eventsApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.eventsApproved}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        {t.eventsRejected}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.eventsRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.eventsRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.eventsRejected}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {t.servicesApproved}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.servicesApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.servicesApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.servicesApproved}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        {t.servicesRejected}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.servicesRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.servicesRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.servicesRejected}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {t.providersApproved}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.providersApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.providersApproved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.providersApproved}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        {t.providersRejected}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.providersRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.providersRejected}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.providersRejected}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        {t.ticketsResolved}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.ticketsResolved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.ticketsResolved}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.ticketsResolved}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <Shield className="h-4 w-4 text-purple-600" />
                        {t.roleUpdates}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastWeek.roleUpdates}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.lastMonth.roleUpdates}</TableCell>
                    <TableCell className="text-center font-bold">{selectedAdminData.sinceCreation.roleUpdates}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell className={`font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <Activity className="h-4 w-4 text-primary" />
                        {t.totalActions}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg">{selectedAdminData.lastWeek.totalActions}</TableCell>
                    <TableCell className="text-center font-bold text-lg">{selectedAdminData.lastMonth.totalActions}</TableCell>
                    <TableCell className="text-center font-bold text-lg">{selectedAdminData.sinceCreation.totalActions}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
