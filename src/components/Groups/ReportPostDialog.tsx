import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';

interface ReportPostDialogProps {
  postId: string;
  postType: 'group_post' | 'group_message';
  trigger?: React.ReactNode;
}

export const ReportPostDialog = ({ postId, postType, trigger }: ReportPostDialogProps) => {
  const { t } = useLanguageContext();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch the message content and sender
      let messageContent = '';
      let senderId = '';
      
      if (postType === 'group_post') {
        const { data } = await supabase
          .from('group_posts')
          .select('content, user_id')
          .eq('id', postId)
          .single();
        messageContent = data?.content || '';
        senderId = data?.user_id || '';
      } else {
        const { data } = await supabase
          .from('group_messages')
          .select('content, sender_id')
          .eq('id', postId)
          .single();
        messageContent = data?.content || '';
        senderId = data?.sender_id || '';
      }
      
      const { error } = await supabase
        .from('reported_messages')
        .insert({
          message_id: postId,
          message_type: postType,
          message_content: messageContent,
          sender_id: senderId,
          reported_by: user.id,
          reason,
          additional_details: details,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('groups.reportSuccess'));
      setOpen(false);
      setReason('');
      setDetails('');
    },
    onError: () => {
      toast.error(t('groups.reportError'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Flag className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('groups.reportPost')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('groups.reportReason')}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t('groups.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">{t('groups.reportReasonSpam')}</SelectItem>
                <SelectItem value="harassment">{t('groups.reportReasonHarassment')}</SelectItem>
                <SelectItem value="inappropriate">{t('groups.reportReasonInappropriate')}</SelectItem>
                <SelectItem value="false_info">{t('groups.reportReasonFalseInfo')}</SelectItem>
                <SelectItem value="other">{t('groups.reportReasonOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">{t('groups.reportDetails')}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t('groups.reportDetailsPlaceholder')}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportMutation.mutate()}
              disabled={!reason || reportMutation.isPending}
            >
              {t('groups.submitReport')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};