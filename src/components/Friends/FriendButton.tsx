import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';

interface FriendButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const FriendButton: React.FC<FriendButtonProps> = ({ 
  userId, 
  variant = 'default',
  size = 'default'
}) => {
  const { status, loading, sendFriendRequest, cancelRequest, acceptRequest, unfriend } = useFriendshipStatus(userId);

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Clock className="ml-2 h-4 w-4" />
        جاري التحميل...
      </Button>
    );
  }

  if (status === 'none') {
    return (
      <Button variant={variant} size={size} onClick={sendFriendRequest}>
        <UserPlus className="ml-2 h-4 w-4" />
        إضافة صديق
      </Button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Button variant="outline" size={size} onClick={cancelRequest}>
        <Clock className="ml-2 h-4 w-4" />
        طلب معلق
        <X className="mr-2 h-3 w-3" />
      </Button>
    );
  }

  if (status === 'pending_received') {
    return (
      <Button variant="default" size={size} onClick={acceptRequest}>
        <UserCheck className="ml-2 h-4 w-4" />
        قبول الطلب
      </Button>
    );
  }

  if (status === 'friends') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size}>
            <UserCheck className="ml-2 h-4 w-4" />
            أصدقاء
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={unfriend} className="text-destructive">
            إلغاء الصداقة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === 'blocked') {
    return (
      <Button variant="outline" size={size} disabled>
        محظور
      </Button>
    );
  }

  return null;
};