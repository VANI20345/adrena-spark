import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FollowButton from './FollowButton';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useMutualFollowers } from '@/hooks/useFollow';
import { cn } from '@/lib/utils';
import { Lock, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface UserCardProps {
  userId: string;
  fullName: string | null;
  displayId: string;
  avatarUrl: string | null;
  bio?: string | null;
  followersCount?: number;
  followingCount?: number;
  showFollowButton?: boolean;
  showMessageButton?: boolean;
  isPrivate?: boolean;
  compact?: boolean;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({
  userId,
  fullName,
  displayId,
  avatarUrl,
  bio,
  followersCount,
  followingCount,
  showFollowButton = true,
  showMessageButton = false,
  isPrivate = false,
  compact = false,
  className,
}) => {
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const { data: mutualFollowers } = useMutualFollowers(userId);
  const isRTL = language === 'ar';

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleMessage = () => {
    navigate(`/messages/${userId}`);
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
        isRTL && 'flex-row-reverse',
        className
      )}>
        <Link to={`/user/${userId}`} className="shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm hover:ring-primary/20 transition-all">
            <AvatarImage src={avatarUrl || undefined} alt={fullName || displayId} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
          <Link to={`/user/${userId}`} className="hover:underline">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm truncate">{fullName || displayId}</p>
              {isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{displayId}</p>
          </Link>
          {mutualFollowers && mutualFollowers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {mutualFollowers.length} {isRTL ? 'مشتركين' : 'mutual'}
            </p>
          )}
        </div>
        <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          {showMessageButton && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMessage}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          {showFollowButton && (
            <FollowButton userId={userId} size="sm" variant="outline" showIcon={false} isPrivate={isPrivate} />
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      'overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20',
      className
    )}>
      <CardContent className="p-0">
        {/* Profile header with gradient background */}
        <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
        
        <div className="px-4 pb-4 -mt-8">
          {/* Avatar and action buttons */}
          <div className={cn('flex items-end justify-between mb-3', isRTL && 'flex-row-reverse')}>
            <Link to={`/user/${userId}`} className="shrink-0">
              <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg hover:ring-primary/20 transition-all">
                <AvatarImage src={avatarUrl || undefined} alt={fullName || displayId} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className={cn('flex items-center gap-2 mb-1', isRTL && 'flex-row-reverse')}>
              {showMessageButton && (
                <Button variant="outline" size="sm" className="h-8" onClick={handleMessage}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
              {showFollowButton && (
                <FollowButton userId={userId} size="sm" showIcon isPrivate={isPrivate} />
              )}
            </div>
          </div>

          {/* User info */}
          <div className={cn('space-y-2', isRTL && 'text-right')}>
            <div>
              <Link to={`/user/${userId}`} className="hover:underline">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground">{fullName || displayId}</h3>
                  {isPrivate && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      <Lock className="h-3 w-3 mr-0.5" />
                      {isRTL ? 'خاص' : 'Private'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{displayId}</p>
              </Link>
            </div>

            {bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">{bio}</p>
            )}

            {/* Stats row */}
            <div className={cn('flex items-center gap-4 text-sm pt-1', isRTL && 'flex-row-reverse')}>
              {followersCount !== undefined && (
                <Link to={`/user/${userId}/followers`} className="hover:underline">
                  <span className="font-semibold text-foreground">{formatCount(followersCount)}</span>
                  <span className="text-muted-foreground ml-1">{isRTL ? 'متابع' : 'followers'}</span>
                </Link>
              )}
              {followingCount !== undefined && (
                <Link to={`/user/${userId}/following`} className="hover:underline">
                  <span className="font-semibold text-foreground">{formatCount(followingCount)}</span>
                  <span className="text-muted-foreground ml-1">{isRTL ? 'يتابع' : 'following'}</span>
                </Link>
              )}
            </div>

            {/* Mutual followers */}
            {mutualFollowers && mutualFollowers.length > 0 && (
              <div className={cn('flex items-center gap-2 pt-2', isRTL && 'flex-row-reverse')}>
                <div className="flex -space-x-2">
                  {mutualFollowers.slice(0, 3).map((mutual) => (
                    <Avatar key={mutual.user_id} className="h-6 w-6 ring-2 ring-background">
                      <AvatarImage src={mutual.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {mutual.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? `يتابعه ${mutualFollowers.length} من أصدقائك`
                    : `Followed by ${mutualFollowers.length} friend${mutualFollowers.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
