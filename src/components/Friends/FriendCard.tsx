import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, MoreVertical, MessageSquare, Share2 } from 'lucide-react';
import { Friend } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DirectMessaging } from './DirectMessaging';
import { ShareEventDialog } from './ShareEventDialog';

interface FriendCardProps {
  friend: Friend;
  onUnfriend: (friendId: string) => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({ friend, onUnfriend }) => {
  const navigate = useNavigate();
  const [showMessaging, setShowMessaging] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  if (showMessaging) {
    return (
      <DirectMessaging
        friendId={friend.friend_id}
        friendName={friend.full_name}
        friendAvatar={friend.avatar_url}
        onClose={() => setShowMessaging(false)}
      />
    );
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar 
              className="h-16 w-16 cursor-pointer" 
              onClick={() => navigate(`/profile/${friend.friend_id}`)}
            >
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback>{friend.full_name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 
                className="font-semibold cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${friend.friend_id}`)}
              >
                {friend.full_name}
              </h3>
              {friend.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {friend.city}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowMessaging(true)}
                >
                  <MessageSquare className="h-3 w-3 ml-1" />
                  مراسلة
                </Button>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={() => navigate(`/profile/${friend.friend_id}`)}>
                  عرض الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUnfriend(friend.friend_id)}
                  className="text-destructive"
                >
                  إلغاء الصداقة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </>
  );
};