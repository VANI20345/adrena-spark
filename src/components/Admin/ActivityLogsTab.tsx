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

  const getActionBadge = (action: string) => {
    if (action.includes('approve')) return <Badge variant="default">{language === 'ar' ? 'قبول' : 'Approve'}</Badge>;
    if (action.includes('reject')) return <Badge variant="destructive">{language === 'ar' ? 'رفض' : 'Reject'}</Badge>;
    if (action.includes('delete')) return <Badge variant="secondary">{language === 'ar' ? 'حذف' : 'Delete'}</Badge>;
    if (action.includes('role')) return <Badge>{language === 'ar' ? 'تغيير دور' : 'Role Change'}</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  if (loading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle>{t('admin.loading')}</CardTitle>
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
          {t('admin.activityLog')}
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
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.adminName')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.action')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.entityType')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.details')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.date')}</TableHead>
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
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {log.details && typeof log.details === 'object' ? (
                        <div className="space-y-1 text-sm">
                          {log.details.user_name && (
                            <div><span className="font-medium">{language === 'ar' ? 'المستخدم:' : 'User:'}</span> {log.details.user_name}</div>
                          )}
                          {log.details.user_email && (
                            <div><span className="font-medium">{t('admin.userEmail')}:</span> {log.details.user_email}</div>
                          )}
                          {log.details.event_title && (
                            <div><span className="font-medium">{t('admin.eventName')}:</span> {log.details.event_title}</div>
                          )}
                          {log.details.service_name && (
                            <div><span className="font-medium">{t('admin.serviceName')}:</span> {log.details.service_name}</div>
                          )}
                          {log.details.reason && (
                            <div><span className="font-medium">{t('admin.reason')}:</span> {log.details.reason}</div>
                          )}
                          {log.details.duration_days && (
                            <div><span className="font-medium">{t('admin.durationDays')}:</span> {log.details.duration_days} {language === 'ar' ? 'يوم' : 'days'}</div>
                          )}
                          {log.details.suspended_until && (
                            <div><span className="font-medium">{language === 'ar' ? 'حتى:' : 'Until:'}</span> {new Date(log.details.suspended_until).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</div>
                          )}
                          {log.details.new_role && (
                            <div><span className="font-medium">{t('admin.newRole')}:</span> {log.details.new_role}</div>
                          )}
                          {log.details.comment && (
                            <div><span className="font-medium">{t('admin.comment')}:</span> {log.details.comment}</div>
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
