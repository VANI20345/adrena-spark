import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface GroupPostProps {
  post: any;
  onUpdate: () => void;
}

export const GroupPost: React.FC<GroupPostProps> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const isRTL = language === 'ar';

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        setIsLiked(false);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        setIsLiked(true);
      }
      onUpdate();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(full_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    setComments(data || []);
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment
        });
      
      setNewComment('');
      loadComments();
      onUpdate();
      toast({
        title: isRTL ? 'تم إضافة التعليق' : 'Comment added',
        description: isRTL ? 'تم نشر تعليقك بنجاح' : 'Your comment has been posted successfully'
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء إضافة التعليق' : 'Error adding comment',
        variant: 'destructive'
      });
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
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
      </CardHeader>
      <CardContent>
        <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
        
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.media_urls.map((url: string, idx: number) => (
              <img 
                key={idx}
                src={url}
                alt={`Post media ${idx + 1}`}
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span>{post.likes_count || 0} {isRTL ? 'إعجاب' : 'likes'}</span>
          <span>{post.comments_count || 0} {isRTL ? 'تعليق' : 'comments'}</span>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button 
            variant={isLiked ? 'default' : 'ghost'} 
            size="sm" 
            onClick={handleLike}
            className="flex-1"
          >
            <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            {isRTL ? 'إعجاب' : 'Like'}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleComments}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isRTL ? 'تعليق' : 'Comment'}
          </Button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback>
                    {comment.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted rounded-lg p-3">
                  <div className="font-semibold text-sm">{comment.profiles?.full_name}</div>
                  <p className="text-sm">{comment.content}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(comment.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Textarea
                placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
              />
              <Button onClick={handleComment} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
