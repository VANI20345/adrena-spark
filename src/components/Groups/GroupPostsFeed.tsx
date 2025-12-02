import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CreatePostDialog } from './CreatePostDialog';
import { EnhancedPostDetailsDialog } from './EnhancedPostDetailsDialog';
import { PollPost } from './PollPost';
import { ImageViewerDialog } from './ImageViewerDialog';
import { useGroupPosts, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';

interface GroupPostsFeedProps {
  groupId: string;
  userRole?: string;
}

export const GroupPostsFeed: React.FC<GroupPostsFeedProps> = ({ groupId, userRole }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageCaption, setImageCaption] = useState('');
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
                    {post.media_urls.map((url: string, idx: number) => {
                      const isVideo = post.media_type === 'video' || url.match(/\.(mp4|webm|ogg)$/i);
                      return isVideo ? (
                        <video
                          key={idx}
                          src={url}
                          controls
                          className="w-full object-cover max-h-96"
                        />
                      ) : (
                        <img
                          key={idx}
                          src={url}
                          alt={`Post media ${idx + 1}`}
                          className={`w-full object-cover cursor-pointer hover:opacity-95 transition-opacity ${
                            post.media_urls!.length === 1 ? 'max-h-[500px]' : 'h-64'
                          }`}
                          onClick={() => {
                            setSelectedImages(post.media_urls!);
                            setSelectedImageIndex(idx);
                            setImageCaption(post.content || '');
                          }}
                        />
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

      {selectedImages.length > 0 && (
        <ImageViewerDialog
          images={selectedImages}
          currentIndex={selectedImageIndex}
          open={selectedImages.length > 0}
          onClose={() => setSelectedImages([])}
          caption={imageCaption}
        />
      )}
    </div>
  );
};
