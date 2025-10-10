import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';

interface Suggestion {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  mutual_friends: number;
  shared_events: number;
  same_city: boolean;
  score: number;
}

export const PeopleYouMayKnowSmart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadSmartSuggestions();
    }
  }, [user]);

  const loadSmartSuggestions = async () => {
    if (!user) return;

    try {
      // Get current friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Get pending friend requests to exclude
      const { data: pendingRequests } = await supabase
        .from('friend_requests')
        .select('receiver_id, sender_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending');

      const pendingIds = pendingRequests?.map(r => 
        r.sender_id === user.id ? r.receiver_id : r.sender_id
      ) || [];

      // Get user's profile for city matching
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('city')
        .eq('user_id', user.id)
        .single();

      // Get user's event participation
      const { data: myEvents } = await supabase
        .from('bookings')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      const myEventIds = myEvents?.map(b => b.event_id) || [];

      // Get all potential users (excluding current user, friends, and pending requests)
      const excludeIds = [user.id, ...friendIds, ...pendingIds];
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city')
        .not('user_id', 'in', `(${excludeIds.join(',')})`);

      if (!allUsers || allUsers.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Calculate scores for each user
      const scoredSuggestions = await Promise.all(
        allUsers.map(async (potentialFriend) => {
          let score = 0;

          // 1. Mutual friends (highest weight)
          const { data: mutualFriends } = await supabase
            .from('friendships')
            .select('friend_id, user_id')
            .or(`user_id.eq.${potentialFriend.user_id},friend_id.eq.${potentialFriend.user_id}`)
            .eq('status', 'accepted');

          const theirFriendIds = mutualFriends?.map(f =>
            f.user_id === potentialFriend.user_id ? f.friend_id : f.user_id
          ) || [];

          const mutualCount = theirFriendIds.filter(id => friendIds.includes(id)).length;
          score += mutualCount * 10; // 10 points per mutual friend

          // 2. Shared events (medium weight)
          const { data: theirEvents } = await supabase
            .from('bookings')
            .select('event_id')
            .eq('user_id', potentialFriend.user_id)
            .eq('status', 'confirmed');

          const theirEventIds = theirEvents?.map(b => b.event_id) || [];
          const sharedEvents = theirEventIds.filter(id => myEventIds.includes(id)).length;
          score += sharedEvents * 5; // 5 points per shared event

          // 3. Same city (lower weight)
          const sameCity = myProfile?.city && potentialFriend.city === myProfile.city;
          if (sameCity) {
            score += 3; // 3 points for same city
          }

          return {
            user_id: potentialFriend.user_id,
            full_name: potentialFriend.full_name,
            avatar_url: potentialFriend.avatar_url,
            city: potentialFriend.city,
            mutual_friends: mutualCount,
            shared_events: sharedEvents,
            same_city: sameCity || false,
            score
          };
        })
      );

      // Sort by score and take top 10
      const topSuggestions = scoredSuggestions
        .filter(s => s.score > 0) // Only show users with some connection
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setSuggestions(topSuggestions);
    } catch (error) {
      console.error('Error loading smart suggestions:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الاقتراحات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    setSendingRequests(prev => new Set(prev).add(receiverId));

    try {
      const { error } = await supabase.functions.invoke('send-friend-request', {
        body: { receiver_id: receiverId }
      });

      if (error) throw error;

      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب الصداقة بنجاح'
      });

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== receiverId));
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إرسال طلب الصداقة',
        variant: 'destructive'
      });
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أشخاص قد تعرفهم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            لا توجد اقتراحات متاحة حالياً
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          أشخاص قد تعرفهم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.user_id}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={suggestion.avatar_url || undefined} />
                <AvatarFallback>{suggestion.full_name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h4 className="font-semibold">{suggestion.full_name}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {suggestion.mutual_friends > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 ml-1" />
                      {suggestion.mutual_friends} صديق مشترك
                    </Badge>
                  )}
                  {suggestion.shared_events > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="h-3 w-3 ml-1" />
                      {suggestion.shared_events} فعالية مشتركة
                    </Badge>
                  )}
                  {suggestion.same_city && suggestion.city && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="h-3 w-3 ml-1" />
                      {suggestion.city}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => sendFriendRequest(suggestion.user_id)}
                disabled={sendingRequests.has(suggestion.user_id)}
              >
                <UserPlus className="h-4 w-4 ml-1" />
                {sendingRequests.has(suggestion.user_id) ? 'جاري الإرسال...' : 'إضافة'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
