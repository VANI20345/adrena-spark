import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReportedMessage {
  id: string;
  message_id: string;
  message_type: string;
  reported_by: string;
  reason: string;
  additional_details: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  message_content: string;
  sender_id: string;
  created_at: string;
  reporter_name?: string;
  sender_name?: string;
}

export const ReportedMessagesTab = () => {
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportedMessage | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reported_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load reporter and sender names
      if (data) {
        const reporterIds = [...new Set(data.map(r => r.reported_by))];
        const senderIds = [...new Set(data.map(r => r.sender_id))];
        const allUserIds = [...new Set([...reporterIds, ...senderIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', allUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        const enrichedData = data.map(report => ({
          ...report,
          reporter_name: profileMap.get(report.reported_by) || 'مستخدم محذوف',
          sender_name: profileMap.get(report.sender_id) || 'مستخدم محذوف'
        }));

        setReports(enrichedData);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('فشل تحميل البلاغات');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: ReportedMessage) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reported_messages')
        .update({
          status: newStatus,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('تم تحديث حالة البلاغ');
      setDetailsDialogOpen(false);
      loadReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('فشل تحديث البلاغ');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, icon: React.ReactNode }> = {
      pending: { variant: 'destructive', label: 'قيد الانتظار', icon: <AlertTriangle className="w-3 h-3" /> },
      reviewing: { variant: 'secondary', label: 'قيد المراجعة', icon: <Clock className="w-3 h-3" /> },
      resolved: { variant: 'default', label: 'تم الحل', icon: <CheckCircle className="w-3 h-3" /> },
      dismissed: { variant: 'outline', label: 'تم الرفض', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getMessageTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      group: 'مجموعة فعالية',
      friend_group: 'مجموعة أصدقاء',
      direct: 'رسالة مباشرة'
    };

    return <Badge variant="outline">{types[type] || type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              الرسائل المبلغ عنها
            </CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البلاغات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="reviewing">قيد المراجعة</SelectItem>
                <SelectItem value="resolved">تم الحل</SelectItem>
                <SelectItem value="dismissed">تم الرفض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بلاغات
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>المرسل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>{report.reporter_name}</TableCell>
                      <TableCell>{report.sender_name}</TableCell>
                      <TableCell>{getMessageTypeBadge(report.message_type)}</TableCell>
                      <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل البلاغ</DialogTitle>
            <DialogDescription>
              معلومات تفصيلية عن البلاغ والرسالة المبلغ عنها
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">المبلغ</label>
                  <p className="text-sm text-muted-foreground">{selectedReport.reporter_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">المرسل</label>
                  <p className="text-sm text-muted-foreground">{selectedReport.sender_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">نوع الرسالة</label>
                  <div className="mt-1">{getMessageTypeBadge(selectedReport.message_type)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">الحالة الحالية</label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">السبب</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedReport.reason}</p>
              </div>

              {selectedReport.additional_details && (
                <div>
                  <label className="text-sm font-medium">تفاصيل إضافية</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedReport.additional_details}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">محتوى الرسالة المبلغ عنها</label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedReport.message_content}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">ملاحظات الإدارة</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول هذا البلاغ..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'reviewing')}
                  variant="secondary"
                  className="flex-1"
                >
                  <Clock className="w-4 h-4 ml-2" />
                  قيد المراجعة
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                  variant="default"
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تم الحل
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض البلاغ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};