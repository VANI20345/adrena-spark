import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';

export type ReportEntityType = 'group' | 'post' | 'comment' | 'event' | 'service' | 'user';

interface ReportEntityDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: ReportEntityType;
  entityId: string;
  entityName?: string;
}

const reportReasons = {
  group: ['spam', 'harassment', 'inappropriate', 'fraud', 'other'],
  post: ['spam', 'harassment', 'inappropriate', 'false_info', 'hate_speech', 'other'],
  comment: ['spam', 'harassment', 'inappropriate', 'hate_speech', 'other'],
  event: ['spam', 'fraud', 'misleading', 'inappropriate', 'safety_concern', 'other'],
  service: ['spam', 'fraud', 'misleading', 'inappropriate', 'poor_quality', 'other'],
  user: ['spam', 'harassment', 'impersonation', 'inappropriate', 'fraud', 'other'],
};

export const ReportEntityDialog = ({
  open,
  onClose,
  entityType,
  entityId,
  entityName
}: ReportEntityDialogProps) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const getReasonLabel = (reasonKey: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      spam: { en: 'Spam', ar: 'بريد مزعج' },
      harassment: { en: 'Harassment', ar: 'تحرش' },
      inappropriate: { en: 'Inappropriate Content', ar: 'محتوى غير لائق' },
      false_info: { en: 'False Information', ar: 'معلومات خاطئة' },
      hate_speech: { en: 'Hate Speech', ar: 'خطاب كراهية' },
      fraud: { en: 'Fraud/Scam', ar: 'احتيال' },
      misleading: { en: 'Misleading', ar: 'مضلل' },
      safety_concern: { en: 'Safety Concern', ar: 'مخاوف أمنية' },
      poor_quality: { en: 'Poor Quality', ar: 'جودة رديئة' },
      impersonation: { en: 'Impersonation', ar: 'انتحال شخصية' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return isRTL ? labels[reasonKey]?.ar || reasonKey : labels[reasonKey]?.en || reasonKey;
  };

  const getEntityTypeLabel = () => {
    const labels: Record<ReportEntityType, { en: string; ar: string }> = {
      group: { en: 'Group', ar: 'المجموعة' },
      post: { en: 'Post', ar: 'المنشور' },
      comment: { en: 'Comment', ar: 'التعليق' },
      event: { en: 'Event', ar: 'الفعالية' },
      service: { en: 'Service', ar: 'الخدمة' },
      user: { en: 'User', ar: 'المستخدم' },
    };
    return isRTL ? labels[entityType].ar : labels[entityType].en;
  };

  const reportMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('entity_reports')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          reporter_id: user.id,
          reason,
          additional_details: details || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إرسال البلاغ بنجاح' : 'Report submitted successfully');
      handleClose();
    },
    onError: () => {
      toast.error(isRTL ? 'فشل إرسال البلاغ' : 'Failed to submit report');
    },
  });

  const handleClose = () => {
    setReason('');
    setDetails('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="w-5 h-5" />
            {isRTL ? 'الإبلاغ عن' : 'Report'} {getEntityTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            {entityName && (
              <span className="font-medium text-foreground">{entityName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? 'سيتم مراجعة هذا البلاغ من قبل فريق الإدارة. البلاغات الكاذبة قد تؤدي إلى عقوبات.'
                  : 'This report will be reviewed by our admin team. False reports may result in penalties.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{isRTL ? 'سبب الإبلاغ' : 'Reason for Report'}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? 'اختر السبب' : 'Select a reason'} />
              </SelectTrigger>
              <SelectContent>
                {reportReasons[entityType].map((r) => (
                  <SelectItem key={r} value={r}>
                    {getReasonLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{isRTL ? 'تفاصيل إضافية (اختياري)' : 'Additional Details (optional)'}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={isRTL ? 'اشرح سبب الإبلاغ...' : 'Explain why you are reporting this...'}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportMutation.mutate()}
              disabled={!reason || reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isRTL ? 'جاري الإرسال...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  {isRTL ? 'إرسال البلاغ' : 'Submit Report'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
