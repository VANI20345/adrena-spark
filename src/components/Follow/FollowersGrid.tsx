import React from 'react';
import { motion } from 'framer-motion';
import { useFollowers, useFollowing } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import UserCard from './UserCard';
import { Loader2, Users, UserPlus, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowersGridProps {
  userId: string;
  type: 'followers' | 'following';
  compact?: boolean;
  showMessageButton?: boolean;
  className?: string;
}

const FollowersGrid: React.FC<FollowersGridProps> = ({
  userId,
  type,
  compact = false,
  showMessageButton = false,
  className,
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  
  const { data: followers, isLoading: loadingFollowers } = useFollowers(type === 'followers' ? userId : undefined);
  const { data: following, isLoading: loadingFollowing } = useFollowing(type === 'following' ? userId : undefined);

  const users = type === 'followers' ? followers : following;
  const isLoading = type === 'followers' ? loadingFollowers : loadingFollowing;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
        </div>
        <p className="text-sm mt-4 font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col items-center justify-center py-20 text-center',
          isRTL && 'text-right'
        )}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
            {type === 'followers' ? (
              <Heart className="h-10 w-10 text-primary/60" />
            ) : (
              <UserPlus className="h-10 w-10 text-primary/60" />
            )}
          </div>
        </div>
        <h3 className="font-bold text-xl mb-2">
          {type === 'followers' 
            ? (isRTL ? 'لا يوجد متابعون بعد' : 'No followers yet')
            : (isRTL ? 'لا تتابع أحداً بعد' : 'Not following anyone yet')
          }
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {type === 'followers'
            ? (isRTL ? 'عندما يتابعك الآخرون، ستظهر حساباتهم هنا' : 'When others follow this account, they\'ll appear here')
            : (isRTL ? 'عندما تتابع حسابات أخرى، ستظهر هنا' : 'When this account follows others, they\'ll appear here')
          }
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn(
      compact ? 'space-y-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {users.map((user, index) => (
        <motion.div
          key={user.user_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <UserCard
            userId={user.user_id}
            fullName={user.full_name}
            displayId={user.display_id}
            avatarUrl={user.avatar_url}
            bio={user.bio}
            followersCount={user.followers_count}
            followingCount={user.following_count}
            isPrivate={user.is_private}
            showMessageButton={showMessageButton}
            compact={compact}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default FollowersGrid;
