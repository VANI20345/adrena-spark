import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, UserX, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_id: string;
  details: any;
  created_at: string;
  admin?: {
    full_name: string | null;
  };
}

export const ActivityLogsTab = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRTL, language } = useLanguageContext();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      // Fetch from admin_activity_logs with admin profile join
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          admin_id,
          details,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading activity logs:', error);
        return;
      }

      // Fetch admin names separately
      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(log => log.admin_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', adminIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        const logsWithAdmin = data.map(log => ({
          ...log,
          admin: {
            full_name: profileMap.get(log.admin_id) || null
          }
        }));

        setLogs(logsWithAdmin);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('approve')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (action.includes('reject')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (action.includes('delete')) return <UserX className="h-4 w-4 text-orange-500" />;
    if (action.includes('role')) return <Shield className="h-4 w-4 text-blue-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      'approve': { ar: 'قبول', en: 'Approve' },
      'approve_event': { ar: 'قبول فعالية', en: 'Approve Event' },
      'approve_service': { ar: 'قبول خدمة', en: 'Approve Service' },
      'approve_provider': { ar: 'قبول مقدم خدمة', en: 'Approve Provider' },
      'reject': { ar: 'رفض', en: 'Reject' },
      'reject_event': { ar: 'رفض فعالية', en: 'Reject Event' },
      'reject_service': { ar: 'رفض خدمة', en: 'Reject Service' },
      'delete': { ar: 'حذف', en: 'Delete' },
      'delete_user': { ar: 'حذف مستخدم', en: 'Delete User' },
      'role': { ar: 'تغيير دور', en: 'Role Change' },
      'role_update': { ar: 'تحديث دور', en: 'Role Update' },
      'update_user_role': { ar: 'تغيير صلاحية', en: 'Update Role' },
      'suspend_user': { ar: 'تعليق مستخدم', en: 'Suspend User' },
      'unsuspend_user': { ar: 'إلغاء تعليق', en: 'Unsuspend User' },
      'database_backup': { ar: 'نسخة احتياطية', en: 'Database Backup' },
    };

    const matchedKey = Object.keys(labels).find(key => action.includes(key));
    if (matchedKey) {
      return labels[matchedKey][language === 'ar' ? 'ar' : 'en'];
    }
    return action;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('approve')) return <Badge variant="default">{getActionLabel(action)}</Badge>;
    if (action.includes('reject')) return <Badge variant="destructive">{getActionLabel(action)}</Badge>;
    if (action.includes('delete')) return <Badge variant="secondary">{getActionLabel(action)}</Badge>;
    if (action.includes('role')) return <Badge>{getActionLabel(action)}</Badge>;
    if (action.includes('suspend')) return <Badge variant="outline">{getActionLabel(action)}</Badge>;
    return <Badge variant="outline">{getActionLabel(action)}</Badge>;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      'event': { ar: 'فعالية', en: 'Event' },
      'service': { ar: 'خدمة', en: 'Service' },
      'user': { ar: 'مستخدم', en: 'User' },
      'group': { ar: 'مجموعة', en: 'Group' },
      'system': { ar: 'النظام', en: 'System' },
      'booking': { ar: 'حجز', en: 'Booking' },
    };
    return labels[entityType]?.[language === 'ar' ? 'ar' : 'en'] || entityType;
  };

  if (loading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <Activity className="h-5 w-5" />
          {language === 'ar' ? 'سجل النشاطات الإدارية' : 'Admin Activity Logs'}
        </CardTitle>
        <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
          {language === 'ar' 
            ? 'سجل كامل لجميع الإجراءات التي قام بها المسؤولون على المنصة'
            : 'Complete log of all actions performed by administrators on the platform'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState 
            icon={Activity}
            title={language === 'ar' ? 'لا توجد نشاطات مسجلة' : 'No activities logged'}
            description={language === 'ar' 
              ? 'ستظهر هنا جميع الإجراءات التي يقوم بها المسؤولون'
              : 'All administrator actions will appear here'}
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'اسم المشرف' : 'Admin Name'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'الإجراء' : 'Action'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'نوع الكيان' : 'Entity Type'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'التفاصيل' : 'Details'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {log.admin?.full_name || (language === 'ar' ? 'غير معروف' : 'Unknown')}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant="outline">{getEntityTypeLabel(log.entity_type)}</Badge>
                    </TableCell>
                    <TableCell className={`max-w-md ${isRTL ? 'text-right' : 'text-left'}`}>
                      {log.details && typeof log.details === 'object' ? (
                        <div className="space-y-1 text-sm">
                          {log.details.user_name && (
                            <div><span className="font-medium">{language === 'ar' ? 'المستخدم:' : 'User:'}</span> {log.details.user_name}</div>
                          )}
                          {log.details.user_email && (
                            <div><span className="font-medium">{language === 'ar' ? 'البريد:' : 'Email:'}</span> {log.details.user_email}</div>
                          )}
                          {log.details.event_title && (
                            <div><span className="font-medium">{language === 'ar' ? 'الفعالية:' : 'Event:'}</span> {log.details.event_title}</div>
                          )}
                          {log.details.service_name && (
                            <div><span className="font-medium">{language === 'ar' ? 'الخدمة:' : 'Service:'}</span> {log.details.service_name}</div>
                          )}
                          {log.details.reason && (
                            <div><span className="font-medium">{language === 'ar' ? 'السبب:' : 'Reason:'}</span> {log.details.reason}</div>
                          )}
                          {log.details.new_role && (
                            <div><span className="font-medium">{language === 'ar' ? 'الدور الجديد:' : 'New Role:'}</span> {log.details.new_role}</div>
                          )}
                          {log.details.newRole && (
                            <div><span className="font-medium">{language === 'ar' ? 'الدور الجديد:' : 'New Role:'}</span> {log.details.newRole}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-muted-foreground text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {new Date(log.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
