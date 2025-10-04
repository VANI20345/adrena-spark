import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  created_at: string;
  group_id: string;
}

export const useGroupMessages = (groupId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    loadMessages();
    const cleanup = setupRealtimeSubscription();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [groupId]);

  const loadMessages = async () => {
    if (!groupId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          profiles:sender_id (
            full_name
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const messagesWithNames = (data || []).map((msg: any) => ({
        ...msg,
        sender_name: msg.profiles?.full_name || 'مستخدم'
      }));

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newMsg.sender_id)
            .single();

          setMessages((prev) => [...prev, {
            ...newMsg,
            sender_name: profile?.full_name || 'مستخدم'
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user || !groupId) return false;

    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          content: content.trim(),
          sender_id: user.id,
          group_id: groupId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    refetch: loadMessages
  };
};
