import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFriendMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
      setupRealtimeSubscription();
    } else {
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user?.id]);

  const loadUnreadCount = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('friend_messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading unread messages count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friend-message-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const oldRead = payload?.old?.read;
          const newRead = payload?.new?.read;

          if (oldRead === false && newRead === true) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    unreadCount,
    loading,
    refetch: loadUnreadCount
  };
};