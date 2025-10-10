import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FriendsAttendingProps {
  eventId: string;
  maxDisplay?: number;
}

interface AttendingFriend {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export const FriendsAttending = ({ eventId, maxDisplay = 3 }: FriendsAttendingProps) => {
  const { user } = useAuth();
  const [friendsAttending, setFriendsAttending] = useState<AttendingFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && eventId) {
      fetchFriendsAttending();
    }
  }, [user?.id, eventId]);

  const fetchFriendsAttending = async () => {
    if (!user?.id) return;

    try {
      // Get friend IDs
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) {
        setFriendsAttending([]);
        setLoading(false);
        return;
      }

      // Get bookings from friends for this event
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          user_id,
          profiles!bookings_user_id_fkey(full_name, avatar_url, user_id)
        `)
        .eq('event_id', eventId)
        .in('user_id', friendIds)
        .eq('status', 'confirmed');

      if (bookingError) throw bookingError;

      const attending = bookings
        .map((b: any) => ({
          user_id: b.profiles?.user_id,
          full_name: b.profiles?.full_name || 'صديق',
          avatar_url: b.profiles?.avatar_url
        }))
        .filter((f): f is AttendingFriend => f.user_id !== undefined);

      setFriendsAttending(attending);
    } catch (error) {
      console.error('Error fetching friends attending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || friendsAttending.length === 0) {
    return null;
  }

  const displayedFriends = friendsAttending.slice(0, maxDisplay);
  const remainingCount = friendsAttending.length - maxDisplay;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex -space-x-2">
          {displayedFriends.map((friend) => (
            <Tooltip key={friend.user_id}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={friend.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{friend.full_name[0]}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{friend.full_name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Avatar className="h-8 w-8 border-2 border-background bg-muted">
              <AvatarFallback className="text-xs">+{remainingCount}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {friendsAttending.length} {friendsAttending.length === 1 ? 'صديق' : 'أصدقاء'} سيحضر
        </span>
      </TooltipProvider>
    </div>
  );
};