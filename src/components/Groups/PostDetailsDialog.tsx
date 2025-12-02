import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface PostDetailsDialogProps {
  post: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole?: string;
}

export const PostDetailsDialog: React.FC<PostDetailsDialogProps> = ({
  post,
  open,
  onClose,
  onUpdate,
  userRole
}) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (open && post) {
      loadComments();
      setupRealtimeSubscription();
    }
  }, [open, post]);

  const loadComments = async () => {
    if (!post) return;

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            profiles: profileData || { full_name: '', avatar_url: '' }
          };
        })
      );

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${post.id}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: isRTL ? 'تم إضافة التعليق' : 'Comment added',
        description: isRTL ? 'تم نشر تعليقك بنجاح' : 'Your comment has been posted'
      });
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل إضافة التعليق' : 'Failed to add comment',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || (user.id !== commentUserId && userRole !== 'owner' && userRole !== 'admin')) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الحذف' : 'Deleted',
        description: isRTL ? 'تم حذف التعليق' : 'Comment deleted'
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل حذف التعليق' : 'Failed to delete comment',
        variant: 'destructive'
      });
    }
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isRTL ? 'المنشور والتعليقات' : 'Post & Comments'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Original Post */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>
                  {post.profiles?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{post.profiles?.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(post.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                </div>
              </div>
            </div>

            <p className="mb-4 whitespace-pre-wrap">{post.content}</p>

            {post.media_urls && post.media_urls.length > 0 && (
              <div className={`grid gap-2 mb-4 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.media_urls.map((url: string, idx: number) => {
                  const isVideo = post.media_type === 'video' || url.match(/\.(mp4|webm|ogg)$/i);
                  return isVideo ? (
                    <video
                      key={idx}
                      src={url}
                      controls
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  ) : (
                    <img
                      key={idx}
                      src={url}
                      alt={`Media ${idx + 1}`}
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><Heart className="w-4 h-4 inline mr-1" />{post.likes_count || 0}</span>
              <span><Send className="w-4 h-4 inline mr-1" />{post.comments_count || 0}</span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {isRTL ? 'التعليقات' : 'Comments'} ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {isRTL ? 'لا توجد تعليقات بعد' : 'No comments yet'}
              </p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4 pr-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles?.avatar_url} />
                        <AvatarFallback>
                          {comment.profiles?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="font-semibold text-sm mb-1">
                            {comment.profiles?.full_name}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 px-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                          </span>
                          {(comment.user_id === user?.id || userRole === 'owner' || userRole === 'admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {isRTL ? 'حذف' : 'Delete'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </ScrollArea>

        {/* Add Comment Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            size="icon"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
