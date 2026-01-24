import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Lock, RefreshCw, Eye, Ban, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SuspiciousActivity {
  id: string;
  user_id: string | null;
  ip_address: string;
  activity_type: string;
  attempt_count: number;
  last_attempt: string;
  details: any;
  status: 'active' | 'blocked' | 'resolved';
  user_email?: string;
  user_name?: string;
}

export const SuspiciousActivityTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'resolved'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: activities, isLoading, refetch } = useOptimizedQuery(
    ['suspicious-activities', filter],
    async () => {
      // Get suspicious login attempts from admin_activity_logs as a fallback
      // In production, you would create a dedicated security_logs table
      try {
        const { data: logs, error } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .in('action', ['failed_login', 'brute_force', 'suspicious_access'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Transform to expected format
        return (logs || []).map(log => ({
          id: log.id,
          user_id: log.admin_id,
          ip_address: (log.details as any)?.ip_address || 'Unknown',
          activity_type: log.action,
          attempt_count: (log.details as any)?.attempt_count || 1,
          last_attempt: log.created_at,
          details: log.details,
          status: (log.details as any)?.status || 'active',
          user_name: (log.details as any)?.user_name,
        })) as SuspiciousActivity[];
      } catch (error) {
        console.error('Error fetching security logs:', error);
        return [];
      }
    }
  );

  const translations = {
    ar: {
      title: 'مراقبة النشاط المشبوه',
      description: 'تتبع محاولات تسجيل الدخول الفاشلة والأنماط غير الطبيعية',
      refresh: 'تحديث',
      filter: 'تصفية',
      all: 'الكل',
      active: 'نشط',
      blocked: 'محظور',
      resolved: 'تم الحل',
      ipAddress: 'عنوان IP',
      activityType: 'نوع النشاط',
      attempts: 'المحاولات',
      lastAttempt: 'آخر محاولة',
      status: 'الحالة',
      actions: 'الإجراءات',
      block: 'حظر',
      unblock: 'إلغاء الحظر',
      resolve: 'تم الحل',
      view: 'عرض التفاصيل',
      failedLogin: 'محاولة تسجيل دخول فاشلة',
      bruteForce: 'محاولة اختراق',
      abnormalPattern: 'نمط غير طبيعي',
      multipleDevices: 'أجهزة متعددة',
      suspiciousLocation: 'موقع مشبوه',
      noActivities: 'لا توجد أنشطة مشبوهة',
      totalAttempts: 'إجمالي المحاولات',
      blockedIPs: 'عناوين IP محظورة',
      activeThreats: 'تهديدات نشطة',
      resolvedToday: 'تم حلها اليوم',
      user: 'المستخدم',
      unknown: 'غير معروف',
      successBlock: 'تم الحظر بنجاح',
      successUnblock: 'تم إلغاء الحظر بنجاح',
      successResolve: 'تم وضع علامة تم الحل',
      error: 'حدث خطأ',
    },
    en: {
      title: 'Suspicious Activity Monitoring',
      description: 'Track failed login attempts and abnormal access patterns',
      refresh: 'Refresh',
      filter: 'Filter',
      all: 'All',
      active: 'Active',
      blocked: 'Blocked',
      resolved: 'Resolved',
      ipAddress: 'IP Address',
      activityType: 'Activity Type',
      attempts: 'Attempts',
      lastAttempt: 'Last Attempt',
      status: 'Status',
      actions: 'Actions',
      block: 'Block',
      unblock: 'Unblock',
      resolve: 'Resolve',
      view: 'View Details',
      failedLogin: 'Failed Login Attempt',
      bruteForce: 'Brute Force Attempt',
      abnormalPattern: 'Abnormal Pattern',
      multipleDevices: 'Multiple Devices',
      suspiciousLocation: 'Suspicious Location',
      noActivities: 'No suspicious activities',
      totalAttempts: 'Total Attempts',
      blockedIPs: 'Blocked IPs',
      activeThreats: 'Active Threats',
      resolvedToday: 'Resolved Today',
      user: 'User',
      unknown: 'Unknown',
      successBlock: 'Blocked successfully',
      successUnblock: 'Unblocked successfully',
      successResolve: 'Marked as resolved',
      error: 'An error occurred',
    },
  };

  const t = translations[language];

  const activityTypeLabels: Record<string, string> = {
    failed_login: t.failedLogin,
    brute_force: t.bruteForce,
    abnormal_pattern: t.abnormalPattern,
    multiple_devices: t.multipleDevices,
    suspicious_location: t.suspiciousLocation,
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'destructive';
      case 'blocked':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const handleAction = async (activityId: string, action: 'block' | 'unblock' | 'resolve') => {
    setActionLoading(activityId);
    try {
      const newStatus = action === 'block' ? 'blocked' : action === 'unblock' ? 'active' : 'resolved';
      
      // Update the activity log with new status in details
      const { error } = await supabase
        .from('admin_activity_logs')
        .update({ 
          details: { status: newStatus } 
        })
        .eq('id', activityId);

      if (error) throw error;

      toast.success(
        action === 'block' ? t.successBlock : 
        action === 'unblock' ? t.successUnblock : 
        t.successResolve
      );
      refetch();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error(t.error);
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate stats
  const stats = {
    total: activities?.reduce((sum, a) => sum + a.attempt_count, 0) || 0,
    blocked: activities?.filter(a => a.status === 'blocked').length || 0,
    active: activities?.filter(a => a.status === 'active').length || 0,
    resolvedToday: activities?.filter(a => {
      if (a.status !== 'resolved') return false;
      const today = new Date().toDateString();
      return new Date(a.last_attempt).toDateString() === today;
    }).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t.refresh}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalAttempts}</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.blockedIPs}</p>
                <p className="text-3xl font-bold text-red-600">{stats.blocked}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.activeThreats}</p>
                <p className="text-3xl font-bold text-orange-600">{stats.active}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.resolvedToday}</p>
                <p className="text-3xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
              <Lock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{language === 'ar' ? 'سجل الأنشطة المشبوهة' : 'Suspicious Activity Log'}</CardTitle>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.filter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="active">{t.active}</SelectItem>
                <SelectItem value="blocked">{t.blocked}</SelectItem>
                <SelectItem value="resolved">{t.resolved}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.ipAddress}</TableHead>
                  <TableHead>{t.user}</TableHead>
                  <TableHead>{t.activityType}</TableHead>
                  <TableHead>{t.attempts}</TableHead>
                  <TableHead>{t.lastAttempt}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-mono">{activity.ip_address}</TableCell>
                    <TableCell>{activity.user_name || t.unknown}</TableCell>
                    <TableCell>
                      {activityTypeLabels[activity.activity_type] || activity.activity_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={activity.attempt_count > 5 ? 'destructive' : 'secondary'}>
                        {activity.attempt_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(activity.last_attempt), 'PPp', {
                        locale: language === 'ar' ? ar : enUS,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(activity.status)}>
                        {activity.status === 'active' ? t.active :
                         activity.status === 'blocked' ? t.blocked : t.resolved}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {activity.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(activity.id, 'block')}
                            disabled={actionLoading === activity.id}
                          >
                            {actionLoading === activity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Ban className="h-4 w-4" />
                                <span className={isRTL ? 'mr-1' : 'ml-1'}>{t.block}</span>
                              </>
                            )}
                          </Button>
                        )}
                        {activity.status === 'blocked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(activity.id, 'unblock')}
                            disabled={actionLoading === activity.id}
                          >
                            {actionLoading === activity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t.unblock
                            )}
                          </Button>
                        )}
                        {activity.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAction(activity.id, 'resolve')}
                            disabled={actionLoading === activity.id}
                          >
                            {actionLoading === activity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t.resolve
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.noActivities}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspiciousActivityTab;
