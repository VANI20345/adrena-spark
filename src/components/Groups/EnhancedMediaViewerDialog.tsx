import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, ZoomIn, ZoomOut, RotateCcw, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface EnhancedMediaViewerDialogProps {
  media: MediaItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  caption?: string;
  postId?: string;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  onLikeToggle?: () => void;
  onUpdate?: () => void;
  userRole?: string;
}

export const EnhancedMediaViewerDialog: React.FC<EnhancedMediaViewerDialogProps> = ({
  media,
  currentIndex,
  open,
  onClose,
  caption,
  postId,
  isLiked = false,
  likesCount = 0,
  commentsCount = 0,
  onLikeToggle,
  onUpdate,
  userRole
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  
  const [index, setIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIndex(currentIndex);
    resetZoom();
  }, [currentIndex]);

  useEffect(() => {
    setLiked(isLiked);
    setLikes(likesCount);
  }, [isLiked, likesCount]);

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      resetZoom();
      setShowComments(false);
    }
  }, [open]);

  useEffect(() => {
    if (showComments && postId) {
      loadComments();
    }
  }, [showComments, postId]);

  const loadComments = async () => {
    if (!postId) return;
    setLoadingComments(true);
    try {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!user || !postId) return;

    try {
      if (liked) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        setLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: user.id });
        setLiked(true);
        setLikes(prev => prev + 1);
      }
      onLikeToggle?.();
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim() || !postId) return;

    try {
      await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment
        });
      
      setNewComment('');
      loadComments();
      onUpdate?.();
      toast({
        title: isRTL ? 'تم إضافة التعليق' : 'Comment added',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || (user.id !== commentUserId && userRole !== 'owner' && userRole !== 'admin')) return;

    try {
      await supabase.from('comments').delete().eq('id', commentId);
      loadComments();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const goToPrevious = () => {
    setIsPlaying(false);
    resetZoom();
    setIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const goToNext = () => {
    setIsPlaying(false);
    resetZoom();
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') handleZoomIn();
    if (e.key === '-') handleZoomOut();
  }, []);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };

  const currentMedia = media[index];
  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] md:max-w-[95vw] w-full h-[100vh] md:h-[95vh] p-0 bg-black border-none overflow-hidden">
        <div className="flex h-full">
          {/* Media Section */}
          <div className={`flex-1 relative ${showComments ? 'hidden md:flex' : 'flex'} flex-col`}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-start justify-between">
              <div className="flex-1">
                {caption && (
                  <p className="text-white text-sm mt-8 md:mt-0 pr-12 line-clamp-2">{caption}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentMedia.type === 'image' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomIn}
                      className="text-white hover:bg-white/20 h-9 w-9"
                      disabled={zoom >= 4}
                    >
                      <ZoomIn className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomOut}
                      className="text-white hover:bg-white/20 h-9 w-9"
                      disabled={zoom <= 1}
                    >
                      <ZoomOut className="w-5 h-5" />
                    </Button>
                    {zoom > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetZoom}
                        className="text-white hover:bg-white/20 h-9 w-9"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                )}
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

            {/* Media Container */}
            <div 
              className="flex-1 relative flex items-center justify-center select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              {currentMedia.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={currentMedia.url}
                    className="max-w-full max-h-full object-contain"
                    playsInline
                    muted={isMuted}
                    loop
                    onClick={togglePlay}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Video Controls */}
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 h-10 w-10"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 h-10 w-10"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <img
                  ref={imageRef}
                  src={currentMedia.url}
                  alt={`Media ${index + 1}`}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                    maxHeight: 'calc(100vh - 180px)'
                  }}
                  draggable={false}
                />
              )}

              {/* Navigation Arrows */}
              {media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-2 md:left-4 text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/40"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-2 md:right-4 text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/40"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </Button>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            {postId && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`text-white hover:bg-white/20 gap-2 ${liked ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                    {likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(!showComments)}
                    className="text-white hover:bg-white/20 gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {commentsCount}
                  </Button>
                </div>

                {/* Dots indicator */}
                {media.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {media.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setIndex(i); resetZoom(); }}
                        className={`h-2 rounded-full transition-all ${
                          i === index ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Counter */}
            {media.length > 1 && !postId && (
              <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full mt-8 md:mt-0">
                {index + 1} / {media.length}
              </div>
            )}

            {/* Zoom indicator */}
            {zoom > 1 && (
              <div className="absolute bottom-20 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {Math.round(zoom * 100)}%
              </div>
            )}
          </div>

          {/* Comments Panel */}
          {showComments && postId && (
            <div className="w-full md:w-96 bg-background flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {isRTL ? 'التعليقات' : 'Comments'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowComments(false)} className="md:hidden">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {loadingComments ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {isRTL ? 'جاري التحميل...' : 'Loading...'}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    {isRTL ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Link to={`/user/${comment.user_id}`} onClick={(e) => e.stopPropagation()}>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.profiles?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {comment.profiles?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-3">
                            <Link to={`/user/${comment.user_id}`} className="font-semibold text-sm hover:underline">
                              {comment.profiles?.full_name}
                            </Link>
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
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleComment} size="icon" disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
