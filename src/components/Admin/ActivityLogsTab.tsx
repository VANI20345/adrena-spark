import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, UserX, CheckCircle, XCircle } from 'lucide-react';
import { activityLogService } from '@/services/activityLogService';
import { EmptyState } from '@/components/ui/empty-state';
import { useLanguageContext } from '@/contexts/LanguageContext';

export const ActivityLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, isRTL, language } = useLanguageContext();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await activityLogService.getRecentLogs(100);
      setLogs(data || []);
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
      'reject': { ar: 'رفض', en: 'Reject' },
      'reject_event': { ar: 'رفض فعالية', en: 'Reject Event' },
      'reject_service': { ar: 'رفض خدمة', en: 'Reject Service' },
      'delete': { ar: 'حذف', en: 'Delete' },
      'delete_user': { ar: 'حذف مستخدم', en: 'Delete User' },
      'role': { ar: 'تغيير دور', en: 'Role Change' },
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
          <CardTitle>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {language === 'ar' ? 'سجل النشاطات' : 'Activity Logs'}
        </CardTitle>
        <CardDescription>
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
          <div className="rounded-md border">
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
                    <TableCell className="font-medium">
                      {log.admin?.full_name || (language === 'ar' ? 'غير معروف' : 'Unknown')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getEntityTypeLabel(log.entity_type)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
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
                          {log.details.duration_days && (
                            <div><span className="font-medium">{language === 'ar' ? 'المدة:' : 'Duration:'}</span> {log.details.duration_days} {language === 'ar' ? 'يوم' : 'days'}</div>
                          )}
                          {log.details.suspended_until && (
                            <div><span className="font-medium">{language === 'ar' ? 'حتى:' : 'Until:'}</span> {new Date(log.details.suspended_until).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</div>
                          )}
                          {log.details.new_role && (
                            <div><span className="font-medium">{language === 'ar' ? 'الدور الجديد:' : 'New Role:'}</span> {log.details.new_role}</div>
                          )}
                          {log.details.comment && (
                            <div><span className="font-medium">{language === 'ar' ? 'ملاحظة:' : 'Comment:'}</span> {log.details.comment}</div>
                          )}
                        </div>
                      ) : (
                        <span>{log.details || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
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
