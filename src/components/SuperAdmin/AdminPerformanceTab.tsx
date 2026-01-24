import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Calendar,
  Clock,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminStats {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  eventsApproved: number;
  eventsRejected: number;
  servicesApproved: number;
  servicesRejected: number;
  providersApproved: number;
  providersRejected: number;
  ticketsResolved: number;
  reportsHandled: number;
  totalActions: number;
  lastActive: string | null;
  logs: Array<{ action: string; created_at: string; entity_type: string; details?: any }>;
}

export const AdminPerformanceTab = () => {
  const { isRTL, language } = useLanguageContext();
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('30');

  const { data: admins = [], isLoading, error, refetch } = useSupabaseQuery({
    queryKey: ['admin-performance-stats', timeRange],
    queryFn: async (): Promise<AdminStats[]> => {
      try {
        // Get all admins
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) {
          console.error('Error fetching admin roles:', rolesError);
          throw rolesError;
        }
        
        if (!adminRoles || adminRoles.length === 0) return [];

        const adminIds = adminRoles.map(r => r.user_id);

        // Get admin profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', adminIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Calculate date range
        const daysAgo = parseInt(timeRange);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        // Get activity logs for each admin within time range
        const { data: logs, error: logsError } = await supabase
          .from('admin_activity_logs')
          .select('admin_id, action, entity_type, details, created_at')
          .in('admin_id', adminIds)
          .gte('created_at', startDate)
          .order('created_at', { ascending: false });

        if (logsError) {
          console.error('Error fetching logs:', logsError);
          throw logsError;
        }

        // Calculate stats for each admin
        const adminStats: AdminStats[] = adminIds.map(adminId => {
          const profile = (profiles || []).find(p => p.user_id === adminId);
          const adminLogs = (logs || []).filter(l => l.admin_id === adminId);
          
          const eventsApproved = adminLogs.filter(l => l.action === 'approve_event').length;
          const eventsRejected = adminLogs.filter(l => l.action === 'reject_event').length;
          const servicesApproved = adminLogs.filter(l => l.action === 'approve_service').length;
          const servicesRejected = adminLogs.filter(l => l.action === 'reject_service').length;
          const providersApproved = adminLogs.filter(l => l.action === 'approve_provider').length;
          const providersRejected = adminLogs.filter(l => l.action === 'reject_provider').length;
          const ticketsResolved = adminLogs.filter(l => l.action?.includes('ticket') || l.action?.includes('resolve')).length;
          const reportsHandled = adminLogs.filter(l => l.action?.includes('report')).length;
          const totalActions = adminLogs.length;
          const lastActive = adminLogs.length > 0 ? adminLogs[0].created_at : null;

          return {
            user_id: adminId,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            eventsApproved,
            eventsRejected,
            servicesApproved,
            servicesRejected,
            providersApproved,
            providersRejected,
            ticketsResolved,
            reportsHandled,
            totalActions,
            lastActive,
            logs: adminLogs.map(l => ({ 
              action: l.action, 
              created_at: l.created_at, 
              entity_type: l.entity_type,
              details: l.details 
            })),
          };
        });

        // Sort by total actions descending
        return adminStats.sort((a, b) => b.totalActions - a.totalActions);
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
      timeRange: 'الفترة الزمنية',
      last7Days: 'آخر 7 أيام',
      last30Days: 'آخر 30 يوم',
      last90Days: 'آخر 90 يوم',
      allTime: 'كل الوقت',
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
      totalActions: 'إجمالي الإجراءات',
      performanceDetails: 'تفاصيل الأداء',
      comprehensiveBreakdown: 'تفصيل شامل لجميع الإجراءات المتخذة',
      noActivityLogs: 'لا توجد سجلات نشاط',
      lastActive: 'آخر نشاط',
      admin: 'مشرف',
      refresh: 'تحديث',
      approved: 'موافقات',
      rejected: 'رفض',
      tickets: 'تذاكر',
      actionColumn: 'الإجراء',
      dateTime: 'التاريخ والوقت',
      entityType: 'نوع الكيان',
    },
    en: {
      title: 'Admin Performance',
      description: 'Monitor and track performance of all system administrators',
      timeRange: 'Time Range',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      last90Days: 'Last 90 days',
      allTime: 'All time',
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
      totalActions: 'Total Actions',
      performanceDetails: 'Performance Details',
      comprehensiveBreakdown: 'Comprehensive breakdown of all actions taken',
      noActivityLogs: 'No activity logs found',
      lastActive: 'Last Active',
      admin: 'Admin',
      refresh: 'Refresh',
      approved: 'Approved',
      rejected: 'Rejected',
      tickets: 'Tickets',
      actionColumn: 'Action',
      dateTime: 'Date & Time',
      entityType: 'Entity Type',
    },
  };

  const t = translations[language];

  // Safely find selected admin data
  const selectedAdminData = selectedAdmin 
    ? admins.find(a => a.user_id === selectedAdmin) 
    : null;

  const formatActionName = (action: string) => {
    return action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
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
          <CardContent className="pt-6 text-center py-12">
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
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <BarChart3 className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t.timeRange} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t.last7Days}</SelectItem>
              <SelectItem value="30">{t.last30Days}</SelectItem>
              <SelectItem value="90">{t.last90Days}</SelectItem>
              <SelectItem value="365">{t.allTime}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Admin Summary Cards */}
      {admins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <Card 
              key={admin.user_id} 
              className={`cursor-pointer transition-all hover:shadow-md ${selectedAdmin === admin.user_id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedAdmin(admin.user_id === selectedAdmin ? null : admin.user_id)}
            >
              <CardContent className="pt-6">
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {admin.avatar_url ? (
                      <img src={admin.avatar_url} alt={admin.full_name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h3 className="font-semibold">{admin.full_name || t.unknownAdmin}</h3>
                    <p className="text-sm text-muted-foreground">
                      {admin.totalActions} {t.actions}
                    </p>
                    {admin.lastActive && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(admin.lastActive), isRTL ? 'dd/MM/yyyy HH:mm' : 'MMM dd, HH:mm')}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className={`${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Shield className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {t.admin}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                    <p className="text-lg font-bold text-green-600">{admin.eventsApproved + admin.servicesApproved + admin.providersApproved}</p>
                    <p className="text-xs text-muted-foreground">{t.approved}</p>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                    <p className="text-lg font-bold text-red-600">{admin.eventsRejected + admin.servicesRejected + admin.providersRejected}</p>
                    <p className="text-xs text-muted-foreground">{t.rejected}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                    <p className="text-lg font-bold text-blue-600">{admin.ticketsResolved + admin.reportsHandled}</p>
                    <p className="text-xs text-muted-foreground">{t.tickets}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t.noAdmins}</h3>
            <p className="text-muted-foreground">{t.noAdminsDesc}</p>
          </CardContent>
        </Card>
      )}

      {/* Selected Admin Details */}
      {selectedAdminData && (
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="h-5 w-5" />
              {t.performanceDetails} - {selectedAdminData.full_name || t.unknownAdmin}
            </CardTitle>
            <CardDescription>{t.comprehensiveBreakdown}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stats" dir={isRTL ? 'rtl' : 'ltr'}>
              <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
                <TabsTrigger value="stats">{t.statistics}</TabsTrigger>
                <TabsTrigger value="activity">{t.activityLog}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{t.eventsApproved}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.eventsApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{t.eventsRejected}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.eventsRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{t.servicesApproved}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.servicesApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{t.servicesRejected}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.servicesRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{t.providersApproved}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.providersApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{t.providersRejected}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.providersRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{t.ticketsResolved}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.ticketsResolved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Activity className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">{t.totalActions}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.totalActions}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.actionColumn}</TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.entityType}</TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.dateTime}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAdminData.logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            {t.noActivityLogs}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedAdminData.logs.slice(0, 20).map((log, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="outline">{formatActionName(log.action)}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.entity_type || 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(log.created_at), isRTL ? 'dd/MM/yyyy HH:mm' : 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};