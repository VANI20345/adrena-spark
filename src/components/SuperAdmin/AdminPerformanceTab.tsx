import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  TrendingUp
} from 'lucide-react';

interface AdminStats {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  eventsApproved: number;
  eventsRejected: number;
  servicesApproved: number;
  servicesRejected: number;
  providersApproved: number;
  providersRejected: number;
  ticketsResolved: number;
  totalActions: number;
  logs: Array<{ action: string; created_at: string }>;
}

export const AdminPerformanceTab = () => {
  const { isRTL } = useLanguageContext();
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  const { data: admins = [], isLoading, error } = useSupabaseQuery({
    queryKey: ['admin-performance-stats'],
    queryFn: async (): Promise<AdminStats[]> => {
      // Get all admins
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const adminIds = adminRoles.map(r => r.user_id);

      // Get admin profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', adminIds);

      if (profilesError) throw profilesError;

      // Get activity logs for each admin
      const { data: logs, error: logsError } = await supabase
        .from('admin_activity_logs')
        .select('admin_id, action, created_at')
        .in('admin_id', adminIds);

      if (logsError) throw logsError;

      // Calculate stats for each admin
      const adminStats: AdminStats[] = adminIds.map(adminId => {
        const profile = profiles?.find(p => p.user_id === adminId);
        const adminLogs = logs?.filter(l => l.admin_id === adminId) || [];
        
        const eventsApproved = adminLogs.filter(l => l.action === 'approve_event').length;
        const eventsRejected = adminLogs.filter(l => l.action === 'reject_event').length;
        const servicesApproved = adminLogs.filter(l => l.action === 'approve_service').length;
        const servicesRejected = adminLogs.filter(l => l.action === 'reject_service').length;
        const providersApproved = adminLogs.filter(l => l.action === 'approve_provider').length;
        const providersRejected = adminLogs.filter(l => l.action === 'reject_provider').length;
        const ticketsResolved = adminLogs.filter(l => l.action?.includes('ticket')).length;
        const totalActions = adminLogs.length;

        return {
          user_id: adminId,
          full_name: profile?.full_name || (isRTL ? 'مشرف غير معروف' : 'Unknown Admin'),
          avatar_url: profile?.avatar_url || null,
          eventsApproved,
          eventsRejected,
          servicesApproved,
          servicesRejected,
          providersApproved,
          providersRejected,
          ticketsResolved,
          totalActions,
          logs: adminLogs.map(l => ({ action: l.action, created_at: l.created_at })),
        };
      });

      return adminStats;
    },
  });

  // Safely find selected admin data
  const selectedAdminData = selectedAdmin 
    ? admins.find(a => a.user_id === selectedAdmin) 
    : null;

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
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'حدث خطأ' : 'An Error Occurred'}
            </h3>
            <p className="text-muted-foreground">
              {isRTL ? 'لم نتمكن من تحميل بيانات الأداء' : 'Unable to load performance data'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-2xl font-bold">{isRTL ? 'أداء المشرفين' : 'Admin Performance'}</h2>
        <p className="text-muted-foreground">
          {isRTL ? 'إحصائيات وأداء كل مشرف في النظام' : 'Statistics and performance for each admin in the system'}
        </p>
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
                      <img src={admin.avatar_url} alt={admin.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{admin.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {admin.totalActions} {isRTL ? 'إجراء' : 'actions'}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Activity className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {isRTL ? 'مشرف' : 'Admin'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                    <p className="text-lg font-bold text-green-600">{admin.eventsApproved + admin.servicesApproved}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'موافقات' : 'Approved'}</p>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                    <p className="text-lg font-bold text-red-600">{admin.eventsRejected + admin.servicesRejected}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'رفض' : 'Rejected'}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                    <p className="text-lg font-bold text-blue-600">{admin.ticketsResolved}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'تذاكر' : 'Tickets'}</p>
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
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'لا يوجد مشرفين' : 'No Admins Found'}
            </h3>
            <p className="text-muted-foreground">
              {isRTL ? 'لم يتم تعيين أي مشرفين بعد' : 'No admins have been assigned yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Admin Details */}
      {selectedAdminData && (
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <BarChart3 className="h-5 w-5" />
              {isRTL ? `تفاصيل أداء ${selectedAdminData.full_name}` : `Performance Details - ${selectedAdminData.full_name}`}
            </CardTitle>
            <CardDescription>
              {isRTL ? 'تفصيل شامل لجميع الإجراءات المتخذة' : 'Comprehensive breakdown of all actions taken'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stats" dir={isRTL ? 'rtl' : 'ltr'}>
              <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
                <TabsTrigger value="stats">{isRTL ? 'الإحصائيات' : 'Statistics'}</TabsTrigger>
                <TabsTrigger value="activity">{isRTL ? 'سجل النشاط' : 'Activity Log'}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{isRTL ? 'فعاليات موافق عليها' : 'Events Approved'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.eventsApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{isRTL ? 'فعاليات مرفوضة' : 'Events Rejected'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.eventsRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{isRTL ? 'خدمات موافق عليها' : 'Services Approved'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.servicesApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{isRTL ? 'خدمات مرفوضة' : 'Services Rejected'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.servicesRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{isRTL ? 'مقدمي خدمات موافق عليهم' : 'Providers Approved'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.providersApproved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{isRTL ? 'مقدمي خدمات مرفوضين' : 'Providers Rejected'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.providersRejected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{isRTL ? 'تذاكر تم حلها' : 'Tickets Resolved'}</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedAdminData.ticketsResolved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">{isRTL ? 'إجمالي الإجراءات' : 'Total Actions'}</span>
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
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الإجراء' : 'Action'}</TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAdminData.logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                            {isRTL ? 'لا توجد سجلات نشاط' : 'No activity logs found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedAdminData.logs.slice(0, 20).map((log, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="outline">{log.action?.replace(/_/g, ' ') || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
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
