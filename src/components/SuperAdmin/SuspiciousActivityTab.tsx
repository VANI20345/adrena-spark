import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Lock, RefreshCw, Ban, Loader2, Info, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SuspiciousActivity {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  admin_name?: string;
}

export const SuspiciousActivityTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [filter, setFilter] = useState<'all' | 'login' | 'role' | 'suspend' | 'delete'>('all');

  // Define which actions are considered "suspicious / risky" — these are the
  // only events shown in this tab.  Normal moderation actions (approve/reject
  // events or services, ticket replies, etc.) are intentionally excluded.
  const SUSPICIOUS_KEYWORDS = [
    'suspend', 'unsuspend', 'user_suspended', 'user_unsuspended',
    'role_update', 'update_user_role', 'assign_role', 'remove_role', 'change_user_role',
    'delete_user', 'delete_user_completely', 'delete',
    'terminate_session', 'session_terminated',
    'failed_login', 'login_failed', 'failed_attempt',
    'warning', 'warn_user',
    'ban', 'block',
    'permission_denied',
    'spam', 'abuse', 'report_threshold',
  ];

  const isSuspicious = (action: string | null | undefined): boolean => {
    if (!action) return false;
    const a = action.toLowerCase();
    return SUSPICIOUS_KEYWORDS.some(kw => a.includes(kw));
  };

  const { data: activities, isLoading, refetch } = useSupabaseQuery({
    queryKey: ['suspicious-activities-only', filter],
    queryFn: async () => {
      try {
        // Pull a generous slice of the admin and super-admin logs and then
        // filter client-side to only suspicious actions.
        const { data: adminLogs, error: adminError } = await supabase
          .from('admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (adminError) throw adminError;

        const { data: superLogs } = await supabase
          .from('super_admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        // Get admin profiles for names
        const allAdminIds = [
          ...new Set([
            ...(adminLogs?.map(l => l.admin_id) || []),
            ...(superLogs?.map((l: any) => l.super_admin_id) || []),
          ].filter(Boolean))
        ];
        
        let profiles: any[] = [];
        if (allAdminIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', allAdminIds);
          profiles = profilesData || [];
        }

        const mappedAdminLogs = (adminLogs || []).map(log => ({
          ...log,
          admin_name: profiles.find(p => p.user_id === log.admin_id)?.full_name
            || (language === 'ar' ? 'مشرف غير معروف' : 'Unknown Admin'),
          source: 'admin' as const,
        }));

        const mappedSuperLogs = (superLogs || []).map((log: any) => ({
          id: log.id,
          admin_id: log.super_admin_id,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id || '',
          details: log.details,
          created_at: log.created_at,
          admin_name: profiles.find(p => p.user_id === log.super_admin_id)?.full_name
            || (language === 'ar' ? 'مشرف عام غير معروف' : 'Unknown Super Admin'),
          source: 'super_admin' as const,
        }));

        // Keep only suspicious actions, then optionally apply the user filter
        let merged = [...mappedAdminLogs, ...mappedSuperLogs]
          .filter(l => isSuspicious(l.action))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 200);

        if (filter !== 'all') {
          const filterMap: Record<string, string[]> = {
            login: ['failed_login', 'login_failed', 'failed_attempt'],
            role: ['role_update', 'update_user_role', 'assign_role', 'remove_role', 'change_user_role'],
            suspend: ['suspend', 'unsuspend', 'user_suspended', 'user_unsuspended', 'ban'],
            delete: ['delete', 'terminate_session', 'session_terminated'],
          };
          const keys = filterMap[filter] || [];
          merged = merged.filter(l =>
            keys.some(k => l.action?.toLowerCase().includes(k))
          );
        }

        return merged as SuspiciousActivity[];
      } catch (error) {
        console.error('Error fetching suspicious activity logs:', error);
        return [];
      }
    }
  });

  const translations = {
    ar: {
      title: 'مراقبة النشاط المشبوه',
      description: 'إجراءات حساسة فقط: التعليق، تغيير الصلاحيات، الحذف، إنهاء الجلسات، محاولات الدخول الفاشلة',
      refresh: 'تحديث',
      filter: 'تصفية',
      all: 'الكل',
      login: 'تسجيل الدخول',
      role: 'الصلاحيات',
      suspend: 'التعليق',
      delete: 'الحذف',
      admin: 'المشرف',
      action: 'الإجراء',
      entityType: 'نوع الكيان',
      details: 'التفاصيل',
      date: 'التاريخ',
      noActivities: 'لا توجد أنشطة مشبوهة',
      noActivitiesDesc: 'النظام نظيف — لم يتم تسجيل أي إجراءات حساسة',
      totalActions: 'إجمالي الأنشطة المشبوهة',
      todayActions: 'أنشطة مشبوهة اليوم',
      roleChanges: 'تغييرات الصلاحيات',
      suspensions: 'حالات التعليق',
      realDataNote: 'تُعرض هنا فقط الإجراءات الحساسة والمشبوهة من سجل المشرفين والمشرفين الأعلى',
    },
    en: {
      title: 'Suspicious Activity Monitoring',
      description: 'Only sensitive events: suspensions, role changes, deletions, session termination, failed logins',
      refresh: 'Refresh',
      filter: 'Filter',
      all: 'All',
      login: 'Login',
      role: 'Roles',
      suspend: 'Suspensions',
      delete: 'Deletions',
      admin: 'Admin',
      action: 'Action',
      entityType: 'Entity Type',
      details: 'Details',
      date: 'Date',
      noActivities: 'No suspicious activity',
      noActivitiesDesc: 'System is clean — no sensitive admin events have been recorded',
      totalActions: 'Total Suspicious Actions',
      todayActions: 'Suspicious Actions Today',
      roleChanges: 'Role Changes',
      suspensions: 'Suspensions',
      realDataNote: 'Showing only sensitive/suspicious events from admin and super-admin audit logs',
    },
  };

  const t = translations[language];

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('approve')) {
      return <Badge className="bg-green-600">{action.replace(/_/g, ' ')}</Badge>;
    }
    if (actionLower.includes('reject') || actionLower.includes('delete') || actionLower.includes('suspend')) {
      return <Badge className="bg-red-600">{action.replace(/_/g, ' ')}</Badge>;
    }
    if (actionLower.includes('role') || actionLower.includes('assign')) {
      return <Badge className="bg-purple-600">{action.replace(/_/g, ' ')}</Badge>;
    }
    return <Badge variant="secondary">{action.replace(/_/g, ' ')}</Badge>;
  };

  // Calculate stats
  const today = new Date().toDateString();
  const stats = {
    total: activities?.length || 0,
    today: activities?.filter(a => new Date(a.created_at).toDateString() === today).length || 0,
    roleChanges: activities?.filter(a => a.action.toLowerCase().includes('role')).length || 0,
    suspensions: activities?.filter(a => a.action.toLowerCase().includes('suspend')).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className={isRTL ? 'flex-row-reverse self-start' : 'self-start'}>
          <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t.refresh}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className={`text-blue-800 dark:text-blue-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.realDataNote}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.totalActions}</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.todayActions}</p>
                <p className="text-3xl font-bold text-blue-600">{stats.today}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.roleChanges}</p>
                <p className="text-3xl font-bold text-purple-600">{stats.roleChanges}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.suspensions}</p>
                <p className="text-3xl font-bold text-red-600">{stats.suspensions}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle>{language === 'ar' ? 'سجل الأنشطة' : 'Activity Log'}</CardTitle>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className={`w-[150px] ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <SelectValue placeholder={t.filter} />
              </SelectTrigger>
              <SelectContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="login">{t.login}</SelectItem>
                <SelectItem value="role">{t.role}</SelectItem>
                <SelectItem value="suspend">{t.suspend}</SelectItem>
                <SelectItem value="delete">{t.delete}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <Table dir={isRTL ? 'rtl' : 'ltr'}>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.admin}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.action}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.entityType}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.details}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t.date}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{activity.admin_name}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>{getActionBadge(activity.action)}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant="outline">{activity.entity_type}</Badge>
                    </TableCell>
                    <TableCell className={`max-w-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      {activity.details && typeof activity.details === 'object' ? (
                        <div className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                          {Object.entries(activity.details).slice(0, 2).map(([key, value]) => (
                            <span key={key} className={`block ${isRTL ? 'text-right' : 'text-left'}`}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-muted-foreground ${isRTL ? 'text-left' : 'text-right'}`}>
                      {format(new Date(activity.created_at), 'PPp', {
                        locale: language === 'ar' ? ar : enUS,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t.noActivities}</p>
              <p className="text-sm">{t.noActivitiesDesc}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspiciousActivityTab;