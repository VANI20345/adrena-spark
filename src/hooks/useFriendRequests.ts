import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  message: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  sender_city: string | null;
}

export const useFriendRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    fetchRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Fetch incoming requests
      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          message,
          created_at,
          profiles!friend_requests_sender_id_fkey (
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      const incomingList: FriendRequest[] = (incoming || []).map((req: any) => ({
        id: req.id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status,
        message: req.message,
        created_at: req.created_at,
        sender_name: req.profiles?.full_name || 'مستخدم',
        sender_avatar: req.profiles?.avatar_url,
        sender_city: req.profiles?.city
      }));

      setIncomingRequests(incomingList);

      // Fetch outgoing requests
      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          message,
          created_at,
          profiles!friend_requests_receiver_id_fkey (
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      const outgoingList: FriendRequest[] = (outgoing || []).map((req: any) => ({
        id: req.id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status,
        message: req.message,
        created_at: req.created_at,
        sender_name: req.profiles?.full_name || 'مستخدم',
        sender_avatar: req.profiles?.avatar_url,
        sender_city: req.profiles?.city
      }));

      setOutgoingRequests(outgoingList);
    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل طلبات الصداقة',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: requestId, action: 'accept' }
      });

      if (error) throw error;

      toast({
        title: 'تم قبول الطلب',
        description: 'أصبحتما أصدقاء الآن'
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل قبول طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: requestId, action: 'reject' }
      });

      if (error) throw error;

      toast({
        title: 'تم رفض الطلب',
        description: 'تم رفض طلب الصداقة'
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل رفض طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: requestId, action: 'cancel' }
      });

      if (error) throw error;

      toast({
        title: 'تم إلغاء الطلب',
        description: 'تم إلغاء طلب الصداقة'
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إلغاء طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    refetch: fetchRequests,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    incomingCount: incomingRequests.length
  };
};