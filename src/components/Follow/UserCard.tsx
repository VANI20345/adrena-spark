import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutualFollowers } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import FollowButton from './FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, MessageCircle, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserCardProps {
  userId: string;
  fullName: string | null;
  displayId: string;
  avatarUrl: string | null;
  bio?: string | null;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  showFollowButton?: boolean;
  showMessageButton?: boolean;
  compact?: boolean;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({
  userId,
  fullName,
  displayId,
  avatarUrl,
  bio,
  followersCount = 0,
  followingCount = 0,
  isPrivate = false,
  showFollowButton = true,
  showMessageButton = false,
  compact = false,
  className,
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const { data: mutualFollowers } = useMutualFollowers(userId);
  const isOwnProfile = user?.id === userId;

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleMessage = () => {
    navigate('/messages', { state: { recipientId: userId } });
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ backgroundColor: 'hsl(var(--muted)/0.5)' }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer",
          isRTL && "flex-row-reverse",
          className
        )}
        onClick={() => navigate(`/user/${userId}`)}
      >
        <Avatar className="h-12 w-12 ring-2 ring-primary/10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
            {fullName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{fullName || displayId}</p>
            {isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">@{displayId}</p>
        </div>
        {showFollowButton && !isOwnProfile && (
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton userId={userId} isPrivate={isPrivate} size="sm" />
          </div>
        )}
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
      </motion.div>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20",
      className
    )}>
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="h-16 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
          <div className={cn("absolute -bottom-8", isRTL ? "right-4" : "left-4")}>
            <Link to={`/user/${userId}`}>
              <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg transition-transform group-hover:scale-105">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold">
                  {fullName?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          {isPrivate && (
            <Badge variant="secondary" className={cn("absolute top-2 text-xs gap-1", isRTL ? "left-2" : "right-2")}>
              <Lock className="h-3 w-3" />
              {isRTL ? 'خاص' : 'Private'}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className={cn("pt-10 px-4 pb-4", isRTL && "text-right")}>
          <Link to={`/user/${userId}`} className="block mb-3">
            <h3 className="font-bold text-lg truncate hover:text-primary transition-colors">
              {fullName || displayId}
            </h3>
            <p className="text-sm text-muted-foreground">@{displayId}</p>
          </Link>

          {bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Stats */}
          <div className={cn("flex items-center gap-4 mb-4 text-sm", isRTL && "flex-row-reverse justify-end")}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">{formatCount(followersCount)}</span>
              <span className="text-muted-foreground">{isRTL ? 'متابع' : 'followers'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">{formatCount(followingCount)}</span>
              <span className="text-muted-foreground">{isRTL ? 'يتابع' : 'following'}</span>
            </div>
          </div>

          {/* Mutual Followers */}
          {mutualFollowers && mutualFollowers.length > 0 && (
            <div className={cn("flex items-center gap-2 mb-4 text-xs text-muted-foreground", isRTL && "flex-row-reverse")}>
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {mutualFollowers.slice(0, 3).map((m) => (
                  <Avatar key={m.user_id} className="h-5 w-5 ring-2 ring-background">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {m.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span>
                {isRTL 
                  ? `${mutualFollowers.length} متابعين مشتركين`
                  : `${mutualFollowers.length} mutual`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            {showFollowButton && !isOwnProfile && (
              <div className="flex-1">
                <FollowButton userId={userId} isPrivate={isPrivate} className="w-full" />
              </div>
            )}
            {showMessageButton && !isOwnProfile && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleMessage}
                className="shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
