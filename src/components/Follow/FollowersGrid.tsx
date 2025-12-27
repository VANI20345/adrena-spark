import React from 'react';
import { useFollowers, useFollowing } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import UserCard from './UserCard';
import { Loader2, Users } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        isRTL && 'text-right'
      )}>
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">
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
      </div>
    );
  }

  return (
    <div className={cn(
      compact ? 'space-y-1' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {users.map((user) => (
        <UserCard
          key={user.user_id}
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
      ))}
    </div>
  );
};

export default FollowersGrid;
