import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type FriendshipStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'blocked';

export const useFriendshipStatus = (userId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(true);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !userId || user.id === userId) {
      setStatus('none');
      setLoading(false);
      return;
    }

    checkFriendshipStatus();
  }, [user, userId]);

  const checkFriendshipStatus = async () => {
    if (!user || !userId) return;

    try {
      // Check if friends
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('friend_id', userId)
        .single();

      if (friendship) {
        if (friendship.status === 'blocked') {
          setStatus('blocked');
        } else {
          setStatus('friends');
        }
        setLoading(false);
        return;
      }

      // Check for pending requests
      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .single();

      if (sentRequest) {
        setStatus('pending_sent');
        setRequestId(sentRequest.id);
        setLoading(false);
        return;
      }

      const { data: receivedRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', userId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .single();

      if (receivedRequest) {
        setStatus('pending_received');
        setRequestId(receivedRequest.id);
        setLoading(false);
        return;
      }

      setStatus('none');
    } catch (error: any) {
      console.error('Error checking friendship status:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-friend-request', {
        body: { receiver_id: userId }
      });

      if (error) throw error;

      toast({
        title: 'تم إرسال الطلب',
        description: 'تم إرسال طلب الصداقة بنجاح'
      });

      checkFriendshipStatus();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إرسال طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const cancelRequest = async () => {
    if (!requestId) return;

    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: requestId, action: 'cancel' }
      });

      if (error) throw error;

      toast({
        title: 'تم الإلغاء',
        description: 'تم إلغاء طلب الصداقة'
      });

      checkFriendshipStatus();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إلغاء الطلب',
        variant: 'destructive'
      });
    }
  };

  const acceptRequest = async () => {
    if (!requestId) return;

    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: requestId, action: 'accept' }
      });

      if (error) throw error;

      toast({
        title: 'تم القبول',
        description: 'أصبحتما أصدقاء الآن'
      });

      checkFriendshipStatus();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل قبول الطلب',
        variant: 'destructive'
      });
    }
  };

  const unfriend = async () => {
    try {
      const { error } = await supabase.functions.invoke('unfriend-user', {
        body: { friend_id: userId }
      });

      if (error) throw error;

      toast({
        title: 'تم إلغاء الصداقة',
        description: 'تم إلغاء الصداقة بنجاح'
      });

      checkFriendshipStatus();
    } catch (error: any) {
      console.error('Error unfriending:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إلغاء الصداقة',
        variant: 'destructive'
      });
    }
  };

  return {
    status,
    loading,
    sendFriendRequest,
    cancelRequest,
    acceptRequest,
    unfriend,
    refetch: checkFriendshipStatus
  };
};