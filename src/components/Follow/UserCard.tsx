import React, { useState } from 'react';
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
import { Lock, MessageCircle, Users, ChevronRight, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportButton } from '@/components/Reports/ReportButton';
import { ContextDetailsDialog } from './ContextDetailsDialog';

interface SharedGroupInfo {
  group_id: string;
  group_name: string;
}

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
  sharedGroups?: SharedGroupInfo[];
  suggestionReason?: 'mutual_group' | 'mutual_connection' | 'popular' | null;
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
  sharedGroups = [],
  suggestionReason,
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const { data: mutualFollowers } = useMutualFollowers(userId);
  const isOwnProfile = user?.id === userId;

  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [contextDialogType, setContextDialogType] = useState<'groups' | 'followers'>('groups');

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleMessage = () => {
    navigate('/messages', { state: { recipientId: userId } });
  };

  const handleContextClick = (type: 'groups' | 'followers') => {
    setContextDialogType(type);
    setContextDialogOpen(true);
  };

  // Build context label - prioritize shared groups over mutual followers
  const renderContextLabel = () => {
    // Priority 1: Shared groups
    if (sharedGroups && sharedGroups.length > 0) {
      const firstGroup = sharedGroups[0];
      const additionalCount = sharedGroups.length - 1;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleContextClick('groups');
          }}
          className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer w-full",
            isRTL && "flex-row-reverse"
          )}
        >
          <Users2 className="h-3 w-3 text-primary/70 shrink-0" />
          <span className="truncate">
            {isRTL 
              ? `أيضاً في ${firstGroup.group_name}${additionalCount > 0 ? ` و ${additionalCount} أخرى` : ''}`
              : `Also in ${firstGroup.group_name}${additionalCount > 0 ? ` + ${additionalCount} more` : ''}`
            }
          </span>
          <ChevronRight className={cn("h-3 w-3 shrink-0", isRTL && "rotate-180")} />
        </button>
      );
    }

    // Priority 2: Mutual followers
    if (mutualFollowers && mutualFollowers.length > 0) {
      const displayNames = mutualFollowers.slice(0, 2).map(m => m.full_name).filter(Boolean);
      const remaining = mutualFollowers.length - displayNames.length;
      
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleContextClick('followers');
          }}
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer w-full",
            isRTL && "flex-row-reverse"
          )}
        >
          <div className={cn("flex shrink-0", isRTL ? "space-x-reverse -space-x-2" : "-space-x-2")}>
            {mutualFollowers.slice(0, 3).map((m) => (
              <Avatar key={m.user_id} className="h-5 w-5 ring-2 ring-background">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {m.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="truncate">
            {isRTL 
              ? `يتابعه ${displayNames.join('، ')}${remaining > 0 ? ` و${remaining} آخرين` : ''}`
              : `Followed by ${displayNames.join(', ')}${remaining > 0 ? ` + ${remaining} others` : ''}`
            }
          </span>
          <ChevronRight className={cn("h-3 w-3 shrink-0", isRTL && "rotate-180")} />
        </button>
      );
    }

    return null;
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ backgroundColor: 'hsl(var(--muted)/0.5)' }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer",
          isRTL && "flex-row-reverse",
          isOwnProfile && "ring-2 ring-primary/20 bg-primary/5",
          className
        )}
        onClick={() => navigate(`/user/${userId}`)}
      >
        <Avatar className={cn("h-12 w-12 ring-2", isOwnProfile ? "ring-primary" : "ring-primary/10")}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
            {fullName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse justify-end")}>
            <p className="font-semibold truncate">{fullName || displayId}</p>
            {isOwnProfile && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                {isRTL ? 'أنت' : 'You'}
              </Badge>
            )}
            {isPrivate && !isOwnProfile && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">@{displayId}</p>
        </div>
        {showFollowButton && !isOwnProfile && (
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton userId={userId} isPrivate={isPrivate} size="sm" />
          </div>
        )}
        {isOwnProfile && (
          <Badge variant="outline" className="text-xs shrink-0">
            {isRTL ? 'عرض الملف' : 'View Profile'}
          </Badge>
        )}
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
      </motion.div>
    );
  }

  return (
    <>
      <Card className={cn(
        "group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20",
        className
      )}>
        <CardContent className="p-0">
          {/* Header with gradient or avatar background - fixed z-index */}
          <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
              />
            )}
            {/* Avatar positioned with proper z-index */}
            <div className={cn("absolute -bottom-8 z-10", isRTL ? "right-4" : "left-4")}>
              <Link to={`/user/${userId}`}>
                <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg transition-transform group-hover:scale-105">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold">
                    {fullName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
            {isOwnProfile ? (
              <Badge variant="default" className={cn("absolute top-2 text-xs gap-1 z-10", isRTL ? "left-2" : "right-2")}>
                {isRTL ? 'ملفك الشخصي' : 'Your Profile'}
              </Badge>
            ) : isPrivate ? (
              <Badge variant="secondary" className={cn("absolute top-2 text-xs gap-1 z-10", isRTL ? "left-2" : "right-2")}>
                <Lock className="h-3 w-3" />
                {isRTL ? 'خاص' : 'Private'}
              </Badge>
            ) : null}
          </div>

          {/* Content - relative positioning to stay above background */}
          <div className={cn("pt-10 px-4 pb-4 relative z-[5]", isRTL && "text-right")}>
            <Link to={`/user/${userId}`} className="block mb-3">
              <h3 className="font-bold text-lg truncate hover:text-primary transition-colors">
                {fullName || displayId}
              </h3>
              <p className={cn("text-sm text-muted-foreground", isRTL && "text-right")}>@{displayId}</p>
            </Link>

            {bio && (
              <p className={cn("text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed", isRTL && "text-right")}>
                {bio}
              </p>
            )}

            {/* Stats with clickable links */}
            <div className={cn("flex items-center gap-4 mb-3 text-sm", isRTL && "flex-row-reverse justify-end")}>
              <Link 
                to={`/user/${userId}/followers`}
                className={cn("flex items-center gap-1.5 hover:text-primary transition-colors", isRTL && "flex-row-reverse")}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-bold text-foreground">{formatCount(followersCount)}</span>
                <span className="text-muted-foreground hover:underline">{isRTL ? 'متابع' : 'followers'}</span>
              </Link>
              <Link 
                to={`/user/${userId}/following`}
                className={cn("flex items-center gap-1.5 hover:text-primary transition-colors", isRTL && "flex-row-reverse")}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-bold text-foreground">{formatCount(followingCount)}</span>
                <span className="text-muted-foreground hover:underline">{isRTL ? 'يتابع' : 'following'}</span>
              </Link>
            </div>

            {/* Context Label (Shared Groups OR Mutual Followers) - Clickable */}
            <div className="mb-4 min-h-[20px]">
              {renderContextLabel()}
            </div>

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
              {!isOwnProfile && (
                <ReportButton
                  entityType="user"
                  entityId={userId}
                  entityName={fullName || displayId}
                  variant="icon"
                  className="shrink-0 opacity-60 hover:opacity-100"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Details Dialog */}
      <ContextDetailsDialog
        open={contextDialogOpen}
        onOpenChange={setContextDialogOpen}
        type={contextDialogType}
        sharedGroups={sharedGroups}
        mutualFollowers={mutualFollowers || []}
        userName={fullName || displayId}
      />
    </>
  );
};

export default UserCard;
