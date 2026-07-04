import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface UserWarningDialogProps {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
}

export const UserWarningDialog = ({ userId, userName, trigger }: UserWarningDialogProps) => {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [content, setContent] = useState('');

  const warningMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_warnings')
        .insert({
          user_id: userId,
          admin_id: user?.id,
          reason,
          content,
        });
      
      if (error) throw error;

      // Log activity
      await supabase.functions.invoke('log-activity', {
        body: {
          action: 'user_warning_issued',
          entityType: 'user',
          entityId: userId,
          details: { reason, user_name: userName }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-warnings', userId] });
      toast.success(t('admin.warnings.issueSuccess'));
      setOpen(false);
      setReason('');
      setContent('');
    },
    onError: () => {
      toast.error(t('admin.warnings.issueError'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t('admin.warnings.issueWarning')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.warnings.issueWarningTo')} {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('admin.warnings.reason')}</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('admin.warnings.reasonPlaceholder')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">{t('admin.warnings.content')}</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('admin.warnings.contentPlaceholder')}
              rows={6}
            />
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">
              {t('admin.warnings.autoSuspendNote')}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => warningMutation.mutate()}
              disabled={!reason.trim() || !content.trim() || warningMutation.isPending}
            >
              {t('admin.warnings.issueWarning')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};