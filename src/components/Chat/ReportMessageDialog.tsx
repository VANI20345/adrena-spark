import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ReportMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  messageContent: string;
  senderId: string;
  messageType: 'group' | 'friend_group' | 'direct';
}

const REPORT_REASONS = [
  { value: 'spam', label: 'رسائل مزعجة أو تكرار' },
  { value: 'harassment', label: 'تحرش أو إساءة' },
  { value: 'hate_speech', label: 'خطاب كراهية' },
  { value: 'violence', label: 'تهديد أو عنف' },
  { value: 'inappropriate', label: 'محتوى غير لائق' },
  { value: 'scam', label: 'احتيال أو نصب' },
  { value: 'other', label: 'أخرى' }
];

export const ReportMessageDialog: React.FC<ReportMessageDialogProps> = ({
  open,
  onOpenChange,
  messageId,
  messageContent,
  senderId,
  messageType
}) => {
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('يرجى اختيار سبب البلاغ');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reported_messages')
        .insert({
          message_id: messageId,
          message_type: messageType,
          reported_by: (await supabase.auth.getUser()).data.user?.id,
          reason: REPORT_REASONS.find(r => r.value === reason)?.label || reason,
          additional_details: additionalDetails || null,
          message_content: messageContent,
          sender_id: senderId,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('تم إرسال البلاغ بنجاح');
      onOpenChange(false);
      setReason('');
      setAdditionalDetails('');
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error('فشل إرسال البلاغ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            الإبلاغ عن رسالة
          </DialogTitle>
          <DialogDescription>
            يرجى اختيار سبب البلاغ وإضافة أي تفاصيل إضافية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>سبب البلاغ</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="details"
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="يمكنك إضافة المزيد من التفاصيل هنا..."
              rows={4}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <Label className="text-xs text-muted-foreground">الرسالة المبلغ عنها:</Label>
            <p className="text-sm mt-1 line-clamp-3">{messageContent}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            variant="destructive"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};