import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface CreatePostDialogProps {
  groupId: string;
  onPostCreated: () => void;
}

export const CreatePostDialog: React.FC<CreatePostDialogProps> = ({ groupId, onPostCreated }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRTL = language === 'ar';

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      toast({
        title: isRTL ? 'تم النشر' : 'Post Created',
        description: isRTL ? 'تم نشر منشورك بنجاح' : 'Your post has been published successfully'
      });

      setContent('');
      setOpen(false);
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء النشر' : 'Error creating post',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {isRTL ? 'إنشاء منشور' : 'Create Post'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? 'إنشاء منشور جديد' : 'Create New Post'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder={isRTL ? 'ماذا تريد أن تشارك؟' : 'What do you want to share?'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm">
              <ImageIcon className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة صورة' : 'Add Image'}
            </Button>
            <Button onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
              {isSubmitting 
                ? (isRTL ? 'جاري النشر...' : 'Publishing...') 
                : (isRTL ? 'نشر' : 'Publish')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
