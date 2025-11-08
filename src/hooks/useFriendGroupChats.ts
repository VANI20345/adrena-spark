import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  event_id: string | null;
  event_name?: string;
  event_date?: string;
  member_count: number;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

export interface GroupChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export const useFriendGroupChats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    fetchChats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('friend-group-chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_group_chat_messages'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;

    try {
      // Get chats the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('friend_group_chat_members')
        .select('chat_id, last_read_at')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const chatIds = (memberData || []).map(m => m.chat_id);

      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Get chat details with event info
      const { data: chatData, error: chatError } = await supabase
        .from('friend_group_chats')
        .select(`
          *,
          events (
            title,
            start_date
          )
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (chatError) throw chatError;

      // Get member counts and last messages for each chat
      const chatsWithDetails = await Promise.all(
        (chatData || []).map(async (chat: any) => {
          // Count members
          const { count: memberCount } = await supabase
            .from('friend_group_chat_members')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id);

          // Get last message
          const { data: lastMessage } = await supabase
            .from('friend_group_chat_messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const memberInfo = memberData?.find(m => m.chat_id === chat.id);
          const { count: unreadCount } = await supabase
            .from('friend_group_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .gt('created_at', memberInfo?.last_read_at || '2000-01-01');

          return {
            id: chat.id,
            name: chat.name,
            description: chat.description,
            created_by: chat.created_by,
            created_at: chat.created_at,
            event_id: chat.event_id,
            event_name: chat.events?.title,
            event_date: chat.events?.start_date,
            member_count: memberCount || 0,
            unread_count: unreadCount || 0,
            last_message: lastMessage?.content,
            last_message_at: lastMessage?.created_at
          };
        })
      );

      setChats(chatsWithDetails);
    } catch (error: any) {
      console.error('Error fetching group chats:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المحادثات الجماعية',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createChat = async (name: string, friendIds: string[], eventId?: string) => {
    if (!user) return null;

    try {
      // Create the chat
      const { data: chatData, error: chatError } = await supabase
        .from('friend_group_chats')
        .insert({
          name,
          created_by: user.id,
          event_id: eventId || null
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add creator as admin
      await supabase
        .from('friend_group_chat_members')
        .insert({
          chat_id: chatData.id,
          user_id: user.id,
          role: 'admin'
        });

      // Add friends as members
      if (friendIds.length > 0) {
        await supabase
          .from('friend_group_chat_members')
          .insert(
            friendIds.map(friendId => ({
              chat_id: chatData.id,
              user_id: friendId,
              role: 'member'
            }))
          );
      }

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء المحادثة الجماعية بنجاح'
      });

      fetchChats();
      return chatData.id;
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء المحادثة',
        variant: 'destructive'
      });
      return null;
    }
  };

  const leaveChat = async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_group_chat_members')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'تم المغادرة',
        description: 'تم مغادرة المحادثة بنجاح'
      });

      fetchChats();
    } catch (error: any) {
      console.error('Error leaving chat:', error);
      toast({
        title: 'خطأ',
        description: 'فشلت مغادرة المحادثة',
        variant: 'destructive'
      });
    }
  };

  const markAsRead = async (chatId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('friend_group_chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return {
    chats,
    loading,
    refetch: fetchChats,
    createChat,
    leaveChat,
    markAsRead
  };
};

export const useFriendGroupChatMessages = (chatId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user) return;

    fetchMessages();
    setupRealtimeSubscription();
  }, [chatId, user]);

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('friend_group_chat_messages')
        .select(`
          *,
          profiles!friend_group_chat_messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const messagesWithDetails: GroupChatMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        sender_name: msg.profiles?.full_name || 'مستخدم',
        sender_avatar: msg.profiles?.avatar_url,
        content: msg.content,
        created_at: msg.created_at
      }));

      setMessages(messagesWithDetails);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`friend-group-chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_group_chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', newMsg.sender_id)
            .single();

          setMessages(prev => [...prev, {
            id: newMsg.id,
            chat_id: newMsg.chat_id,
            sender_id: newMsg.sender_id,
            sender_name: profile?.full_name || 'مستخدم',
            sender_avatar: profile?.avatar_url,
            content: newMsg.content,
            created_at: newMsg.created_at
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user || !chatId) return false;

    try {
      const { error } = await supabase
        .from('friend_group_chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إرسال الرسالة',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages
  };
};
