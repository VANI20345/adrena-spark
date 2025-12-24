import React from 'react';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { UserPlus, UserMinus, UserCheck, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  userId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showIcon?: boolean;
  className?: string;
  isPrivate?: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  size = 'default',
  variant = 'default',
  showIcon = true,
  className,
  isPrivate = false,
}) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { 
    isFollowing, 
    isFollowedBy, 
    isLoading, 
    isCheckingFollow, 
    hasPendingRequest,
    toggleFollow 
  } = useFollow(userId);

  // Don't show button for own profile or if not logged in
  if (!user || user.id === userId) {
    return null;
  }

  const getButtonText = () => {
    if (hasPendingRequest) {
      return language === 'ar' ? 'طلب معلق' : 'Pending';
    }
    if (isFollowing) {
      return language === 'ar' ? 'متابَع' : 'Following';
    }
    if (isFollowedBy) {
      return language === 'ar' ? 'متابعة' : 'Follow Back';
    }
    return language === 'ar' ? 'متابعة' : 'Follow';
  };

  const getIcon = () => {
    if (hasPendingRequest) return Clock;
    if (isFollowing) return UserCheck;
    if (isFollowedBy) return UserPlus;
    return UserPlus;
  };

  const Icon = getIcon();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFollow(userId);
  };

  if (isCheckingFollow) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing || hasPendingRequest ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'transition-all duration-200',
        isFollowing && 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive',
        hasPendingRequest && 'opacity-70',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && <Icon className={cn('h-4 w-4', size !== 'icon' && 'mr-2 rtl:mr-0 rtl:ml-2')} />}
          {size !== 'icon' && getButtonText()}
        </>
      )}
    </Button>
  );
};

export default FollowButton;
