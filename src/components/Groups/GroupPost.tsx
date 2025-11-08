import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GroupPostProps {
  post: any;
  onUpdate: () => void;
  groupId?: string;
  userRole?: string;
}

export const GroupPost: React.FC<GroupPostProps> = ({ post, onUpdate, groupId, userRole }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const isRTL = language === 'ar';
  
  const canDelete = user && (user.id === post.user_id || userRole === 'owner' || userRole === 'admin');

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

  const handleDeletePost = async () => {
    if (!canDelete) return;

    try {
      const { error } = await supabase
        .from('group_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الحذف' : 'Deleted',
        description: isRTL ? 'تم حذف المنشور بنجاح' : 'Post deleted successfully'
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء حذف المنشور' : 'Error deleting post',
        variant: 'destructive'
      });
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
        description: isRTL ? 'تم حذف التعليق بنجاح' : 'Comment deleted successfully'
      });
      loadComments();
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء حذف التعليق' : 'Error deleting comment',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
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
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isRTL ? 'حذف المنشور' : 'Delete Post'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
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
                    <div className="font-semibold text-sm">{comment.profiles?.full_name}</div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(comment.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                    </div>
                  </div>
                  {(user?.id === comment.user_id || userRole === 'owner' || userRole === 'admin') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive mt-1"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {isRTL ? 'حذف' : 'Delete'}
                    </Button>
                  )}
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
