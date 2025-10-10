import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ReportUserButtonProps {
  reportedUserId: string;
}

export const ReportUserButton: React.FC<ReportUserButtonProps> = ({ reportedUserId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason,
          description
        });

      if (error) throw error;

      toast({
        title: 'تم إرسال البلاغ',
        description: 'شكراً لك. سنراجع البلاغ في أقرب وقت'
      });

      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      if (error.code === '23505') {
        toast({
          title: 'تنبيه',
          description: 'لقد قمت بالإبلاغ عن هذا المستخدم مسبقاً',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'خطأ',
          description: 'فشل إرسال البلاغ. يرجى المحاولة مرة أخرى',
          variant: 'destructive'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.id === reportedUserId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Flag className="h-4 w-4 ml-1" />
          إبلاغ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            إبلاغ عن مستخدم
          </DialogTitle>
          <DialogDescription>
            يرجى اختيار سبب الإبلاغ. سنراجع البلاغ ونتخذ الإجراء المناسب
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب الإبلاغ</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="اختر السبب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">إزعاج أو محتوى غير مرغوب</SelectItem>
                <SelectItem value="harassment">تحرش أو إساءة</SelectItem>
                <SelectItem value="fake_profile">حساب وهمي</SelectItem>
                <SelectItem value="inappropriate_content">محتوى غير لائق</SelectItem>
                <SelectItem value="scam">احتيال</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اشرح سبب الإبلاغ بالتفصيل..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting || !reason}>
              {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
