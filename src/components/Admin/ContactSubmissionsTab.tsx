import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Check, Eye } from 'lucide-react';
import { format } from 'date-fns';

export const ContactSubmissionsTab = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('حدث خطأ في تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', submissionId);
      
      if (error) throw error;
      toast.success('تم تحديث الحالة');
      loadSubmissions();
      setSelectedSubmission(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error resolving submission:', error);
      toast.error('حدث خطأ');
    }
  };

  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      general: 'استفسار عام',
      booking: 'حجز فعالية',
      technical: 'مشكلة تقنية',
      organizer: 'أريد أن أصبح منظم',
      provider: 'أريد تقديم خدمة',
      partnership: 'شراكة'
    };
    return categories[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          رسائل "تواصل معنا"
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الموضوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.name}</TableCell>
                  <TableCell>{submission.email}</TableCell>
                  <TableCell>{getCategoryName(submission.category)}</TableCell>
                  <TableCell>{submission.subject}</TableCell>
                  <TableCell>{format(new Date(submission.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant={submission.status === 'resolved' ? 'default' : 'secondary'}>
                      {submission.status === 'resolved' ? 'تم الحل' : 'قيد المعالجة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setAdminNotes(submission.admin_notes || '');
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>تفاصيل الرسالة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">الاسم:</p>
                              <p>{submission.name}</p>
                            </div>
                            <div>
                              <p className="font-semibold">البريد:</p>
                              <p>{submission.email}</p>
                            </div>
                            {submission.phone && (
                              <div>
                                <p className="font-semibold">الهاتف:</p>
                                <p>{submission.phone}</p>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">النوع:</p>
                              <p>{getCategoryName(submission.category)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold">الموضوع:</p>
                            <p>{submission.subject}</p>
                          </div>
                          <div>
                            <p className="font-semibold">الرسالة:</p>
                            <p className="whitespace-pre-wrap">{submission.message}</p>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">ملاحظات الإدارة:</p>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="أضف ملاحظات..."
                              rows={3}
                            />
                          </div>
                          {submission.status === 'pending' && (
                            <Button onClick={() => handleResolve(submission.id)} className="w-full">
                              <Check className="w-4 h-4 ml-2" />
                              تحديد كمحلول
                            </Button>
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
