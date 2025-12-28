import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Image as ImageIcon, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CreatePostDialog } from './CreatePostDialog';
import { EnhancedPostDetailsDialog } from './EnhancedPostDetailsDialog';
import { PollPost } from './PollPost';
import { SocialMediaLightbox } from './SocialMediaLightbox';
import { useGroupPosts, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';

interface GroupPostsFeedProps {
  groupId: string;
  userRole?: string;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export const GroupPostsFeed: React.FC<GroupPostsFeedProps> = ({ groupId, userRole }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPost, setLightboxPost] = useState<any | null>(null);
  const isRTL = language === 'ar';
  const invalidate = useInvalidateGroupQueries();

  // Use TanStack Query hook
  const { data: posts = [], isLoading } = useGroupPosts(groupId, user?.id);

  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [groupId, user]);

  const setupRealtimeSubscription = () => {
    // Subscribe to post changes
    const postsChannel = supabase
      .channel(`group-posts-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_posts',
          filter: `group_id=eq.${groupId}`
        },
        () => invalidate.invalidateGroupPosts(groupId)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_posts',
          filter: `group_id=eq.${groupId}`
        },
        () => invalidate.invalidateGroupPosts(groupId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
      }
      // Invalidate to refetch
      invalidate.invalidateGroupPosts(groupId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const filterPosts = (posts: any[]) => {
    if (selectedTab === 'all') return posts;
    if (selectedTab === 'text') return posts.filter(p => p.post_type === 'text' || !p.post_type);
    if (selectedTab === 'media') return posts.filter(p => p.post_type === 'media');
    if (selectedTab === 'polls') return posts.filter(p => p.post_type === 'poll');
    return posts;
  };

  const handlePostUpdate = () => {
    // Invalidate posts to refetch
    invalidate.invalidateGroupPosts(groupId);
  };

  const filteredPosts = filterPosts(posts);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreatePostDialog groupId={groupId} onPostCreated={handlePostUpdate} />

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
          <TabsTrigger value="text">{isRTL ? 'المنشورات' : 'Posts'}</TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon className="w-4 h-4 mr-1" />
            {isRTL ? 'الصور والفيديو' : 'Media'}
          </TabsTrigger>
          <TabsTrigger value="polls">{isRTL ? 'استطلاعات' : 'Polls'}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {isRTL ? 'لا توجد منشورات بعد' : 'No posts yet'}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all border-border/50">
              <CardContent className="p-0">
                {/* Post Header */}
                <div className="flex items-center gap-3 p-4">
                  <Avatar className="h-11 w-11 ring-2 ring-background">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                      {post.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{post.profiles?.full_name || (isRTL ? 'مستخدم' : 'User')}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), 'PPp', { locale: isRTL ? ar : undefined })}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                {post.content && (
                  <div className="px-4 pb-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                  </div>
                )}

                {/* Media */}
                {post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
                  <div 
                    className={`${post.media_urls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}
                    dir="ltr"
                  >
                    {post.media_urls.slice(0, 4).map((url: string, idx: number) => {
                      const isVideo = post.media_type === 'video' || url.match(/\.(mp4|webm|ogg)$/i);
                      const showOverlay = idx === 3 && post.media_urls.length > 4;
                      
                      const handleMediaClick = () => {
                        const mediaItems: MediaItem[] = post.media_urls.map((u: string) => ({
                          url: u,
                          type: (post.media_type === 'video' || u.match(/\.(mp4|webm|ogg)$/i)) ? 'video' as const : 'image' as const
                        }));
                        setLightboxMedia(mediaItems);
                        setLightboxIndex(idx);
                        setLightboxPost(post);
                      };

                      return (
                        <div 
                          key={idx}
                          className={`relative cursor-pointer overflow-hidden ${
                            post.media_urls!.length === 1 ? 'aspect-video' : 'aspect-square'
                          }`}
                          onClick={handleMediaClick}
                        >
                          {isVideo ? (
                            <div className="relative w-full h-full bg-muted">
                              <video src={url} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                                <Play className="w-12 h-12 text-white fill-white/80" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Post media ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          {showOverlay && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center hover:bg-black/70 transition-colors">
                              <span className="text-white text-2xl font-bold">+{post.media_urls.length - 4}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Poll */}
                {post.post_type === 'poll' && (
                  <div className="px-4 pb-3">
                    <PollPost postId={post.id} />
                  </div>
                )}

                {/* Actions & Stats */}
                <div className="px-4 pt-2 pb-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <button className="hover:underline">
                      {post.likes_count || 0} {isRTL ? 'إعجاب' : 'likes'}
                    </button>
                    <button className="hover:underline" onClick={() => setSelectedPost(post)}>
                      {post.comments_count || 0} {isRTL ? 'تعليق' : 'comments'}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post.user_liked)}
                      className={`flex-1 gap-2 ${post.user_liked ? 'text-red-500 hover:text-red-600' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-current' : ''}`} />
                      <span className="text-xs font-medium">{isRTL ? 'إعجاب' : 'Like'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPost(post)}
                      className="flex-1 gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">{isRTL ? 'تعليق' : 'Comment'}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedPost && (
        <EnhancedPostDetailsDialog
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
          userRole={userRole}
        />
      )}

      {lightboxMedia.length > 0 && (
        <SocialMediaLightbox
          media={lightboxMedia}
          currentIndex={lightboxIndex}
          open={lightboxMedia.length > 0}
          onClose={() => {
            setLightboxMedia([]);
            setLightboxPost(null);
          }}
          post={lightboxPost}
          onLike={handleLike}
          onUpdate={handlePostUpdate}
        />
      )}
    </div>
  );
};
