import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield, UserX, CheckCircle, XCircle } from 'lucide-react';
import { activityLogService } from '@/services/activityLogService';
import { EmptyState } from '@/components/ui/empty-state';

export const ActivityLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (action.includes('approve')) return <Badge variant="default">قبول</Badge>;
    if (action.includes('reject')) return <Badge variant="destructive">رفض</Badge>;
    if (action.includes('delete')) return <Badge variant="secondary">حذف</Badge>;
    if (action.includes('role')) return <Badge>تغيير دور</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>جاري تحميل سجل النشاطات...</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          سجل نشاطات المسؤولين
        </CardTitle>
        <CardDescription>
          سجل كامل لجميع الإجراءات التي قام بها المسؤولون على المنصة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState 
            icon={Activity}
            title="لا توجد نشاطات مسجلة"
            description="ستظهر هنا جميع الإجراءات التي يقوم بها المسؤولون"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.admin?.full_name || 'غير معروف'}
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
                    <TableCell className="max-w-md truncate">
                      {log.details && typeof log.details === 'object' 
                        ? JSON.stringify(log.details)
                        : log.details || '-'
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.created_at).toLocaleString('ar-SA', {
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
