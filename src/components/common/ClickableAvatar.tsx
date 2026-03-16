import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ClickableAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  displayId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

const ClickableAvatar: React.FC<ClickableAvatarProps> = ({
  userId,
  avatarUrl,
  fullName,
  displayId,
  size = 'md',
  className,
  showRing = true,
}) => {
  const getInitials = (name: string | null | undefined) => {
    if (!name) return displayId?.[0]?.toUpperCase() || '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Link 
      to={`/user/${userId}`} 
      className={cn(
        'block shrink-0 transition-transform hover:scale-105',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Avatar className={cn(
        sizeClasses[size],
        showRing && 'ring-2 ring-background shadow-sm hover:ring-primary/20 transition-all'
      )}>
        <AvatarImage src={avatarUrl || undefined} alt={fullName || displayId || 'User'} />
        <AvatarFallback className={cn(
          'bg-primary/10 text-primary font-medium',
          textSizeClasses[size]
        )}>
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};

export default ClickableAvatar;
