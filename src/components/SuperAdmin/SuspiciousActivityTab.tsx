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
  const [filter, setFilter] = useState<'all' | 'login' | 'role' | 'suspend'>('all');

  const { data: activities, isLoading, refetch } = useSupabaseQuery({
    queryKey: ['suspicious-activities-real', filter],
    queryFn: async () => {
      try {
        // Query admin_activity_logs
        let adminQuery = supabase
          .from('admin_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (filter === 'login') {
          adminQuery = adminQuery.ilike('action', '%login%');
        } else if (filter === 'role') {
          adminQuery = adminQuery.ilike('action', '%role%');
        } else if (filter === 'suspend') {
          adminQuery = adminQuery.ilike('action', '%suspend%');
        }

        const { data: adminLogs, error: adminError } = await adminQuery;
        if (adminError) throw adminError;

        // Also query activity_logs for admin actions
        let activityQuery = supabase
          .from('activity_logs')
          .select('*')
          .eq('is_admin_action', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (filter === 'role') {
          activityQuery = activityQuery.ilike('activity_type', '%role%');
        } else if (filter === 'suspend') {
          activityQuery = activityQuery.ilike('activity_type', '%suspend%');
        }

        const { data: activityLogs } = await activityQuery;

        // Get admin profiles for names
        const allAdminIds = [
          ...new Set([
            ...(adminLogs?.map(l => l.admin_id) || []),
            ...(activityLogs?.map(l => l.actor_id) || []),
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

        // Map admin_activity_logs
        const mappedAdminLogs = (adminLogs || []).map(log => ({
          ...log,
          admin_name: profiles.find(p => p.user_id === log.admin_id)?.full_name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
        }));

        // Map activity_logs (admin actions)
        const mappedActivityLogs = (activityLogs || []).map(log => ({
          id: log.id,
          admin_id: log.actor_id,
          action: log.activity_type,
          entity_type: log.entity_type,
          entity_id: log.entity_id || '',
          details: log.entity_data,
          created_at: log.created_at,
          admin_name: profiles.find(p => p.user_id === log.actor_id)?.full_name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
        }));

        // Merge and sort by date
        const merged = [...mappedAdminLogs, ...mappedActivityLogs]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 100);

        return merged as SuspiciousActivity[];
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }
    }
  });

  const translations = {
    ar: {
      title: 'مراقبة النشاط المشبوه',
      description: 'تتبع جميع الإجراءات الإدارية والأنشطة المهمة في النظام',
      refresh: 'تحديث',
      filter: 'تصفية',
      all: 'الكل',
      login: 'تسجيل الدخول',
      role: 'الصلاحيات',
      suspend: 'التعليق',
      admin: 'المشرف',
      action: 'الإجراء',
      entityType: 'نوع الكيان',
      details: 'التفاصيل',
      date: 'التاريخ',
      noActivities: 'لا توجد أنشطة مسجلة',
      noActivitiesDesc: 'ستظهر هنا جميع الإجراءات الإدارية المهمة',
      totalActions: 'إجمالي الإجراءات',
      todayActions: 'إجراءات اليوم',
      roleChanges: 'تغييرات الصلاحيات',
      suspensions: 'حالات التعليق',
      realDataNote: 'هذه البيانات حقيقية من سجل النظام',
    },
    en: {
      title: 'Suspicious Activity Monitoring',
      description: 'Track all administrative actions and important system activities',
      refresh: 'Refresh',
      filter: 'Filter',
      all: 'All',
      login: 'Login',
      role: 'Roles',
      suspend: 'Suspensions',
      admin: 'Admin',
      action: 'Action',
      entityType: 'Entity Type',
      details: 'Details',
      date: 'Date',
      noActivities: 'No activities recorded',
      noActivitiesDesc: 'All important administrative actions will appear here',
      totalActions: 'Total Actions',
      todayActions: 'Today\'s Actions',
      roleChanges: 'Role Changes',
      suspensions: 'Suspensions',
      realDataNote: 'This is real data from the system logs',
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
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className={isRTL ? 'flex-row-reverse' : ''}>
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t.filter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="login">{t.login}</SelectItem>
                <SelectItem value="role">{t.role}</SelectItem>
                <SelectItem value="suspend">{t.suspend}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <Table>
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