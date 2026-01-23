import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ThumbsUp, Smile } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PostLikesDialogProps {
  postId: string;
  open: boolean;
  onClose: () => void;
  likesCount: number;
}

interface LikeUser {
  user_id: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
}

export const PostLikesDialog: React.FC<PostLikesDialogProps> = ({
  postId,
  open,
  onClose,
  likesCount
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  const { data: likers = [], isLoading } = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: async () => {
      const { data: reactions, error } = await supabase
        .from('post_reactions')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!reactions || reactions.length === 0) return [];

      const userIds = reactions.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      return reactions.map(r => ({
        user_id: r.user_id,
        full_name: profileMap[r.user_id]?.full_name || (isRTL ? 'مستخدم' : 'User'),
        avatar_url: profileMap[r.user_id]?.avatar_url || '',
        created_at: r.created_at
      }));
    },
    enabled: open && !!postId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </div>
            <span>{isRTL ? 'الإعجابات' : 'Likes'}</span>
            <span className="text-muted-foreground font-normal text-sm">
              ({likesCount})
            </span>
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'الأشخاص الذين أعجبوا بهذا المنشور' : 'People who liked this post'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px] -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>{isRTL ? 'لا توجد إعجابات بعد' : 'No likes yet'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {likers.map((liker, index) => (
                <Link
                  key={liker.user_id}
                  to={`/user/${liker.user_id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-primary/20 transition-all">
                      <AvatarImage src={liker.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {liker.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                      <Heart className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-primary transition-colors truncate">
                      {liker.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" />
                      {isRTL ? 'أعجب بالمنشور' : 'Liked this post'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
