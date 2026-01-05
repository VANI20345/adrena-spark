import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  ZoomIn, ZoomOut, Maximize2, Download
} from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface PostData {
  id: string;
  content?: string;
  user_id: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  user_liked?: boolean;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface SocialMediaLightboxProps {
  media: MediaItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  post?: PostData;
  onLike?: (postId: string, isLiked: boolean) => void;
  onUpdate?: () => void;
}

export const SocialMediaLightbox: React.FC<SocialMediaLightboxProps> = ({
  media,
  currentIndex,
  open,
  onClose,
  post,
  onLike,
  onUpdate
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  
  const [index, setIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(post?.user_liked || false);
  const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
  }, [currentIndex]);

  useEffect(() => {
    if (post) {
      setIsLiked(post.user_liked || false);
      setLikesCount(post.likes_count || 0);
    }
  }, [post]);

  useEffect(() => {
    if (open && post) {
      loadComments();
    }
  }, [open, post?.id]);

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setZoom(1);
    }
  }, [open]);

  // Scroll thumbnail into view
  useEffect(() => {
    if (thumbnailsRef.current && media.length > 1) {
      const thumbnail = thumbnailsRef.current.children[index] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [index, media.length]);

  const loadComments = async () => {
    if (!post) return;
    const { data: commentsData } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }

    // Fetch profiles for commenters
    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profilesMap: Record<string, { full_name?: string; avatar_url?: string }> = {};
    (profiles || []).forEach(p => {
      profilesMap[p.user_id] = { full_name: p.full_name || undefined, avatar_url: p.avatar_url || undefined };
    });

    const mappedComments: Comment[] = commentsData.map(c => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user_id: c.user_id,
      profiles: profilesMap[c.user_id]
    }));

    setComments(mappedComments);
  };

  const handleComment = async () => {
    if (!user || !post || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
      setNewComment('');
      loadComments();
      onUpdate?.();
      toast({ title: isRTL ? 'تم إضافة التعليق' : 'Comment added' });
    } catch (error) {
      toast({ title: isRTL ? 'خطأ' : 'Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    onLike?.(post.id, isLiked);
  };

  const goToPrevious = () => {
    setIsPlaying(false);
    setZoom(1);
    setIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const goToNext = () => {
    setIsPlaying(false);
    setZoom(1);
    setIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // RTL-aware navigation: in RTL, ArrowLeft goes next, ArrowRight goes previous
    if (e.key === 'ArrowLeft') {
      isRTL ? goToNext() : goToPrevious();
    }
    if (e.key === 'ArrowRight') {
      isRTL ? goToPrevious() : goToNext();
    }
    if (e.key === 'Escape') onClose();
    if (e.key === 'i') setShowInfo(prev => !prev);
  }, [isRTL]);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media[index].url;
    link.download = `media-${index + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentMedia = media[index];
  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 bg-black border-none overflow-hidden flex">
        {/* Left side - Media viewer */}
        <div className="flex-1 relative flex flex-col min-w-0">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-50 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              {post && (
                <>
                  <Avatar className="h-9 w-9 ring-2 ring-white/20">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback className="bg-zinc-700 text-white">
                      {post.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white">
                    <p className="font-semibold text-sm">{post.profiles?.full_name}</p>
                    <p className="text-xs text-white/60">
                      {format(new Date(post.created_at), 'MMM d, yyyy', { locale: isRTL ? ar : undefined })}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo(prev => !prev)}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Media container */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center p-4"
              >
                {currentMedia.type === 'video' ? (
                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg"
                      playsInline
                      muted={isMuted}
                      loop
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    {/* Video overlay controls */}
                    <div 
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-opacity",
                        isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                      </Button>
                    </div>
                    {/* Video bottom controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={currentMedia.url}
                    alt={`Media ${index + 1}`}
                    className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg transition-transform duration-200"
                    style={{ transform: `scale(${zoom})` }}
                    draggable={false}
                    onDoubleClick={() => setZoom(prev => prev === 1 ? 2 : 1)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows - Left arrow on left, Right arrow on right */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-3 text-white hover:bg-white/20 rounded-full h-11 w-11 bg-black/40 backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-3 text-white hover:bg-white/20 rounded-full h-11 w-11 bg-black/40 backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnails strip */}
          {media.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 px-4">
              <div 
                ref={thumbnailsRef}
                className="flex items-center justify-center gap-2 overflow-x-auto py-2 scrollbar-hide"
              >
                {media.map((item, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setIndex(i); setZoom(1); }}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200",
                      i === index 
                        ? "ring-2 ring-white scale-110 z-10" 
                        : "ring-1 ring-white/30 opacity-60 hover:opacity-100"
                    )}
                  >
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full bg-zinc-800">
                        <video src={item.url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Counter badge */}
          {media.length > 1 && (
            <div className="absolute top-16 left-4 text-white text-xs bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">
              {index + 1} / {media.length}
            </div>
          )}
        </div>

        {/* Right side - Post info panel */}
        <AnimatePresence>
          {showInfo && post && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-background border-l border-border flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>{post.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{post.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(post.created_at), 'MMM d, yyyy · h:mm a', { locale: isRTL ? ar : undefined })}
                  </p>
                </div>
              </div>

              {/* Caption */}
              {post.content && (
                <div className="p-4 border-b">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
              )}

              {/* Comments */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      {isRTL ? 'لا توجد تعليقات' : 'No comments yet'}
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={comment.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {comment.profiles?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted rounded-xl px-3 py-2">
                            <p className="font-semibold text-xs">{comment.profiles?.full_name}</p>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-1">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a', { locale: isRTL ? ar : undefined })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="p-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={cn("gap-2", isLiked && "text-red-500")}
                    >
                      <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                      <span className="text-sm font-medium">{likesCount}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{comments.length}</span>
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>

                {/* Comment input */}
                {user && (
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        placeholder={isRTL ? 'أضف تعليقاً...' : 'Add a comment...'}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[40px] max-h-[100px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment();
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleComment} 
                        disabled={!newComment.trim() || isSubmitting}
                        className="px-3"
                      >
                        {isRTL ? 'نشر' : 'Post'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};