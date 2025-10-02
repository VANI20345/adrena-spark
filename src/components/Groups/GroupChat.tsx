import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  group_id: string;
}

interface GroupChatProps {
  groupId: string;
  groupName: string;
  isOwner?: boolean;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName, isOwner = false }) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await (supabase.from('group_messages' as any) as any)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await (supabase.from('group_messages' as any) as any).insert({
        content: newMessage.trim(),
        sender_id: user.id,
        group_id: groupId,
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const labelFor = (message: Message) => {
    if (message.sender_id === user?.id) return t('you', 'أنت');
    return t('member', 'عضو');
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 ml-2" />
          {groupName}
        </CardTitle>
        {isOwner && (
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        <ScrollArea className="flex-1 w-full">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.sender_id !== user?.id && (
                    <div className="text-xs font-medium mb-1">{labelFor(message)}</div>
                  )}
                  <div>{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex space-x-2">
          <Input
            placeholder={t('typeMessage', 'اكتب رسالتك...')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || isLoading} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupChat;
