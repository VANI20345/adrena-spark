import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  friendship_since: string;
  status: string;
}

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    fetchFriends();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          accepted_at,
          status,
          profiles!friendships_friend_id_fkey (
            user_id,
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      const friendsList: Friend[] = (data || []).map((friendship: any) => ({
        id: friendship.id,
        user_id: friendship.user_id,
        friend_id: friendship.friend_id,
        full_name: friendship.profiles?.full_name || 'مستخدم',
        avatar_url: friendship.profiles?.avatar_url,
        city: friendship.profiles?.city,
        friendship_since: friendship.accepted_at,
        status: friendship.status
      }));

      setFriends(friendsList);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل قائمة الأصدقاء',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const unfriend = async (friendId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('unfriend-user', {
        body: { friend_id: friendId }
      });

      if (error) throw error;

      toast({
        title: 'تم إزالة الصديق',
        description: 'تم إزالة الصديق من قائمتك'
      });

      fetchFriends();
    } catch (error: any) {
      console.error('Error unfriending user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إزالة الصديق',
        variant: 'destructive'
      });
    }
  };

  return {
    friends,
    loading,
    refetch: fetchFriends,
    unfriend,
    friendCount: friends.length
  };
};