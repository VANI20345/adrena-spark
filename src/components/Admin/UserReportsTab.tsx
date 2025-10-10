import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Flag, Check, Eye, Ban } from 'lucide-react';
import { format } from 'date-fns';

export const UserReportsTab = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!user_reports_reporter_id_fkey(full_name, email),
          reported_user:profiles!user_reports_reported_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('حدث خطأ في تحميل البلاغات');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({ 
          status: action,
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', reportId);
      
      if (error) throw error;
      toast.success('تم تحديث الحالة');
      loadReports();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('حدث خطأ');
    }
  };

  const getReasonName = (reason: string) => {
    const reasons: Record<string, string> = {
      spam: 'إزعاج أو محتوى غير مرغوب',
      harassment: 'تحرش أو إساءة',
      fake_profile: 'حساب وهمي',
      inappropriate_content: 'محتوى غير لائق',
      scam: 'احتيال',
      other: 'أخرى'
    };
    return reasons[reason] || reason;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          بلاغات المستخدمين
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المبلّغ</TableHead>
                <TableHead>المبلّغ عنه</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{report.reporter?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{report.reporter?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{report.reported_user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{report.reported_user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getReasonName(report.reason)}</TableCell>
                  <TableCell>{format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        report.status === 'resolved' ? 'default' : 
                        report.status === 'dismissed' ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {report.status === 'resolved' ? 'تم الحل' : 
                       report.status === 'dismissed' ? 'مرفوض' : 
                       'قيد المراجعة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setAdminNotes(report.admin_notes || '');
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>تفاصيل البلاغ</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">المبلّغ:</p>
                              <p>{report.reporter?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{report.reporter?.email}</p>
                            </div>
                            <div>
                              <p className="font-semibold">المبلّغ عنه:</p>
                              <p>{report.reported_user?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{report.reported_user?.email}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold">السبب:</p>
                            <p>{getReasonName(report.reason)}</p>
                          </div>
                          {report.description && (
                            <div>
                              <p className="font-semibold">التفاصيل:</p>
                              <p className="whitespace-pre-wrap">{report.description}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold mb-2">ملاحظات الإدارة:</p>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="أضف ملاحظات..."
                              rows={3}
                            />
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button onClick={() => handleResolve(report.id, 'resolved')} className="flex-1">
                                <Check className="w-4 h-4 ml-2" />
                                تم الحل
                              </Button>
                              <Button 
                                onClick={() => handleResolve(report.id, 'dismissed')} 
                                variant="outline"
                                className="flex-1"
                              >
                                <Ban className="w-4 h-4 ml-2" />
                                رفض البلاغ
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
