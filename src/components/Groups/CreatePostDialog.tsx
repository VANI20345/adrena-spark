import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Image as ImageIcon, Video, BarChart3, X } from 'lucide-react';
import { MediaUploadField } from './MediaUploadField';

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
  const [postType, setPostType] = useState<'text' | 'media' | 'poll'>('text');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [canPost, setCanPost] = useState(false);
  const [memberRole, setMemberRole] = useState<string>('');
  const isRTL = language === 'ar';

  useEffect(() => {
    checkPermissions();
  }, [groupId, user]);

  const checkPermissions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setMemberRole(data.role);
      // All group members can create posts
      setCanPost(true);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!user || !canPost) return;
    
    // Validate based on post type
    if (postType === 'text' && !content.trim()) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يرجى كتابة محتوى المنشور' : 'Please enter post content',
        variant: 'destructive'
      });
      return;
    }
    
    if (postType === 'media' && mediaFiles.length === 0) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يرجى إضافة صورة أو فيديو واحد على الأقل' : 'Please add at least one image or video',
        variant: 'destructive'
      });
      return;
    }
    
    if (postType === 'poll') {
      if (!pollQuestion.trim()) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'يرجى كتابة سؤال الاستطلاع' : 'Please enter poll question',
          variant: 'destructive'
        });
        return;
      }
      
      const validOptions = pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'يرجى إضافة خيارين على الأقل' : 'Please add at least 2 options',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      // Upload media files if any
      let uploadedUrls: string[] = [];
      if (postType === 'media' && mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('group-media')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('group-media')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }
      }
      
      // Prepare post data based on type
      let postData: any = {
        group_id: groupId,
        user_id: user.id,
        content: postType === 'poll' ? pollQuestion : content.trim(),
        post_type: postType
      };
      
      if (postType === 'media') {
        postData.media_urls = uploadedUrls;
        postData.media_type = mediaType;
      }
      
      const { data: newPost, error: postError } = await supabase
        .from('group_posts')
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;

      // If poll, create poll options
      if (postType === 'poll' && newPost) {
        const validOptions = pollOptions.filter(opt => opt.trim());
        const optionsData = validOptions.map((option, index) => ({
          post_id: newPost.id,
          option_text: option,
          option_order: index
        }));

        const { error: optionsError } = await supabase
          .from('poll_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      }

      toast({
        title: isRTL ? 'تم النشر' : 'Post Created',
        description: isRTL ? 'تم نشر منشورك بنجاح' : 'Your post has been published successfully'
      });

      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaType('image');
      setPollQuestion('');
      setPollOptions(['', '']);
      setPostType('text');
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

  if (!canPost) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {isRTL ? 'إنشاء منشور' : 'Create Post'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? 'إنشاء منشور جديد' : 'Create New Post'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={postType} onValueChange={(v) => setPostType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <Plus className="w-4 h-4 mr-1" />
              {isRTL ? 'نص' : 'Text'}
            </TabsTrigger>
            <TabsTrigger value="media">
              <ImageIcon className="w-4 h-4 mr-1" />
              {isRTL ? 'وسائط' : 'Media'}
            </TabsTrigger>
            <TabsTrigger value="poll">
              <BarChart3 className="w-4 h-4 mr-1" />
              {isRTL ? 'استطلاع' : 'Poll'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <Textarea
              placeholder={isRTL ? 'ماذا تريد أن تشارك؟' : 'What do you want to share?'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-4">
            <Textarea
              placeholder={isRTL ? 'أضف وصفاً (اختياري)' : 'Add a description (optional)'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            
            <div className="space-y-2">
              <Label>{isRTL ? 'نوع الوسائط' : 'Media Type'}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mediaType === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMediaType('image');
                    setMediaFiles([]);
                  }}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {isRTL ? 'صور' : 'Images'}
                </Button>
                <Button
                  type="button"
                  variant={mediaType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMediaType('video');
                    setMediaFiles([]);
                  }}
                >
                  <Video className="w-4 h-4 mr-1" />
                  {isRTL ? 'فيديو' : 'Video'}
                </Button>
              </div>
            </div>

            <MediaUploadField
              mediaType={mediaType}
              mediaFiles={mediaFiles}
              onMediaFilesChange={setMediaFiles}
            />
          </TabsContent>

          <TabsContent value="poll" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'سؤال الاستطلاع' : 'Poll Question'}</Label>
              <Input
                placeholder={isRTL ? 'اكتب سؤالك هنا' : 'Write your question here'}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'الخيارات' : 'Options'}</Label>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`${isRTL ? 'خيار' : 'Option'} ${index + 1}`}
                    value={option}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePollOption(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addPollOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  {isRTL ? 'إضافة خيار' : 'Add Option'}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting 
              ? (isRTL ? 'جاري النشر...' : 'Publishing...') 
              : (isRTL ? 'نشر' : 'Publish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
