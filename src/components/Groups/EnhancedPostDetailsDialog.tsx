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
import { Heart, Send, MessageCircle, Play, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PostLikesDialog } from './PostLikesDialog';
import { PollPost } from './PollPost';
import { SocialMediaLightbox } from './SocialMediaLightbox';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
}

interface EnhancedPostDetailsDialogProps {
  post: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole?: string;
}

export const EnhancedPostDetailsDialog: React.FC<EnhancedPostDetailsDialogProps> = ({
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
  const [showLikesDialog, setShowLikesDialog] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (open && post) {
      loadComments();
      checkIfLiked();
      setLikesCount(post.likes_count || 0);
    }
  }, [open, post]);

  const checkIfLiked = async () => {
    if (!user || !post) return;
    const { data } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!user || !post) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    
    try {
      if (newLiked) {
        await supabase
          .from('post_reactions')
          .insert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      }
      onUpdate();
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const loadComments = async () => {
    if (!post) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Batch fetch profiles for all commenters using public view
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Create profiles map
      const profilesMap: Record<string, { full_name: string; avatar_url: string }> = {};
      (profiles || []).forEach(p => {
        profilesMap[p.user_id] = { full_name: p.full_name || '', avatar_url: p.avatar_url || '' };
      });

      // Map comments with profiles
      const commentsWithProfiles = (data || []).map(comment => ({
        ...comment,
        profiles: profilesMap[comment.user_id] || { full_name: '', avatar_url: '' }
      }));

      // Build tree structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsWithProfiles.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      commentsWithProfiles.forEach(comment => {
        const commentNode = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies!.push(commentNode);
          } else {
            rootComments.push(commentNode);
          }
        } else {
          rootComments.push(commentNode);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (parentId: string | null = null) => {
    if (!user) return;
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId
        });

      if (error) throw error;

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      
      toast({
        title: isRTL ? 'تم إضافة التعليق' : 'Comment added',
        description: isRTL ? 'تم نشر تعليقك بنجاح' : 'Your comment has been posted'
      });
      
      loadComments();
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

  const toggleReplies = (commentId: string) => {
    const newSet = new Set(showReplies);
    if (newSet.has(commentId)) {
      newSet.delete(commentId);
    } else {
      newSet.add(commentId);
    }
    setShowReplies(newSet);
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isShowingReplies = showReplies.has(comment.id);

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
        <div className="flex gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback>
              {comment.profiles?.full_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="font-semibold text-sm">
                {comment.profiles?.full_name}
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
            <div className="flex items-center gap-4 mt-1 px-2">
              <button className="text-xs text-muted-foreground hover:underline">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
              </button>
              <button 
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => setReplyingTo(comment.id)}
              >
                {isRTL ? 'رد' : 'Reply'}
              </button>
              {hasReplies && (
                <button
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  onClick={() => toggleReplies(comment.id)}
                >
                  <MessageCircle className="w-3 h-3" />
                  {isShowingReplies 
                    ? (isRTL ? 'إخفاء الردود' : 'Hide replies')
                    : `${comment.replies!.length} ${isRTL ? 'رد' : comment.replies!.length === 1 ? 'reply' : 'replies'}`
                  }
                </button>
              )}
            </div>

            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="flex gap-2 mt-3">
                <Textarea
                  placeholder={isRTL ? 'اكتب رداً...' : 'Write a reply...'}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => handleAddComment(comment.id)}
                    disabled={!replyContent.trim() || isSubmitting}
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="h-8 w-8"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render replies */}
        {hasReplies && isShowingReplies && (
          <div className="space-y-3 mt-2">
            {comment.replies!.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>{isRTL ? 'المنشور والتعليقات' : 'Post & Comments'}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Container - using native overflow for better scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="px-6 pb-6">
            {/* Original Post */}
            <div className="pb-4 border-b mb-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>
                {post.profiles?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{post.profiles?.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: isRTL ? ar : undefined })}
              </div>
            </div>
          </div>

          <p className="mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

          {/* Post Media Content */}
          {post.post_type === 'poll' && (
            <div className="mb-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <BarChart3 className="w-4 h-4" />
                {isRTL ? 'استطلاع' : 'Poll'}
              </div>
              <PollPost postId={post.id} />
            </div>
          )}

          {/* Show media from media_url (single media) */}
          {post.media_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              {post.media_type === 'video' ? (
                <video 
                  src={post.media_url} 
                  controls 
                  className="w-full max-h-[300px] object-contain bg-black rounded-lg"
                />
              ) : (
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    setLightboxIndex(0);
                    setShowLightbox(true);
                  }}
                >
                  <img 
                    src={post.media_url} 
                    alt="" 
                    className="w-full max-h-[300px] object-contain rounded-lg hover:opacity-90 transition-opacity"
                  />
                </div>
              )}
            </div>
          )}

          {/* Show media from media_urls array */}
          {post.media_urls && post.media_urls.length > 0 && !post.media_url && (
            <div className={cn(
              "mb-4 grid gap-2 rounded-lg overflow-hidden",
              post.media_urls.length === 1 ? "grid-cols-1" : 
              post.media_urls.length === 2 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {post.media_urls.slice(0, 4).map((url: string, idx: number) => {
                const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "relative overflow-hidden rounded-lg cursor-pointer",
                      post.media_urls.length === 3 && idx === 0 && "col-span-2"
                    )}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setShowLightbox(true);
                    }}
                  >
                    {isVideo ? (
                      <div className="relative w-full h-48 bg-muted">
                        <video src={url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={url} 
                        alt="" 
                        className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                      />
                    )}
                    {idx === 3 && post.media_urls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{post.media_urls.length - 4}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {post.images && post.images.length > 0 && (
            <div className={cn(
              "mb-4 grid gap-2 rounded-lg overflow-hidden",
              post.images.length === 1 ? "grid-cols-1" : 
              post.images.length === 2 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {post.images.slice(0, 4).map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  className={cn(
                    "relative overflow-hidden rounded-lg cursor-pointer",
                    post.images.length === 3 && idx === 0 && "col-span-2"
                  )}
                  onClick={() => {
                    setLightboxIndex(idx);
                    setShowLightbox(true);
                  }}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                  />
                  {idx === 3 && post.images.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{post.images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-3 border-t">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 hover:text-foreground transition",
                isLiked && "text-red-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span>{likesCount}</span>
            </button>
            <button 
              onClick={() => setShowLikesDialog(true)}
              className="flex items-center gap-2 hover:text-primary hover:underline transition"
            >
              {isRTL ? 'عرض الإعجابات' : 'View likes'}
            </button>
            <button className="flex items-center gap-2 hover:text-foreground transition">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments_count || 0}</span>
            </button>
          </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {isRTL ? 'التعليقات' : 'Comments'} ({post.comments_count || 0})
              </h3>

              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {isRTL ? 'كن أول من يعلق' : 'Be the first to comment'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => renderComment(comment))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Comment Input - Fixed at bottom */}
        <div className="px-6 py-4 border-t bg-background shrink-0">
          <div className="flex gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <Textarea
              placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment(null);
                }
              }}
            />
            <Button
              onClick={() => handleAddComment(null)}
              disabled={!newComment.trim() || isSubmitting}
              size="icon"
              className="self-end flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Post Likes Dialog */}
        <PostLikesDialog
          postId={post.id}
          open={showLikesDialog}
          onClose={() => setShowLikesDialog(false)}
          likesCount={likesCount}
        />

        {/* Lightbox for images/videos */}
        {showLightbox && (
          <SocialMediaLightbox
            media={(() => {
              // Prioritize media_urls array
              if (post.media_urls && post.media_urls.length > 0) {
                return post.media_urls.map((url: string) => ({
                  url,
                  type: (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) ? 'video' as const : 'image' as const
                }));
              }
              // Fallback to images array
              if (post.images && post.images.length > 0) {
                return post.images.map((url: string) => ({ url, type: 'image' as const }));
              }
              // Single media_url
              if (post.media_url) {
                return [{ 
                  url: post.media_url, 
                  type: post.media_type === 'video' ? 'video' as const : 'image' as const 
                }];
              }
              return [];
            })()}
            currentIndex={lightboxIndex}
            open={showLightbox}
            onClose={() => setShowLightbox(false)}
            post={{
              id: post.id,
              content: post.content,
              user_id: post.user_id,
              created_at: post.created_at,
              likes_count: likesCount,
              comments_count: post.comments_count || 0,
              user_liked: isLiked,
              profiles: post.profiles
            }}
            onLike={async (postId, wasLiked) => {
              await handleLike();
            }}
            onUpdate={onUpdate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
