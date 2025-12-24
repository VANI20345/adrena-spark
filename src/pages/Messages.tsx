import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, MessageCircle, Search, Circle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  other_user: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    display_id: string;
  };
  last_message?: {
    content: string;
    sender_id: string;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRTL = language === 'ar';

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      
      // Fetch other user profiles
      const otherUserIds = data.map(c => 
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      );
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, display_id')
        .in('user_id', otherUserIds);
      
      // Fetch last messages
      const conversationsWithDetails = await Promise.all(data.map(async (conv) => {
        const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        const otherUser = profiles?.find(p => p.user_id === otherUserId);
        
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const { count: unreadCount } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null);
        
        return {
          ...conv,
          other_user: otherUser || { user_id: otherUserId, full_name: null, avatar_url: null, display_id: 'Unknown' },
          last_message: lastMsg,
          unread_count: unreadCount || 0
        };
      }));
      
      return conversationsWithDetails as Conversation[];
    },
    enabled: !!user
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Mark messages as read
      if (user) {
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .is('read_at', null);
      }
      
      return data as Message[];
    },
    enabled: !!conversationId
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !conversationId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error(isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message');
    }
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
  };

  const selectedConversation = conversations?.find(c => c.id === conversationId);
  const filteredConversations = conversations?.filter(c => 
    !searchQuery || 
    c.other_user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user.display_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 text-center">
          <p>{isRTL ? 'يجب تسجيل الدخول للوصول للرسائل' : 'Please login to access messages'}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <Card className={cn(
            "md:col-span-1 flex flex-col",
            conversationId && "hidden md:flex"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {isRTL ? 'الرسائل' : 'Messages'}
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isRTL ? 'بحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingConversations ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {isRTL ? 'لا توجد محادثات' : 'No conversations yet'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations?.map(conv => (
                      <Link
                        key={conv.id}
                        to={`/messages/${conv.id}`}
                        className={cn(
                          "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors",
                          conv.id === conversationId && "bg-muted"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conv.other_user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(conv.other_user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {(conv.unread_count ?? 0) > 0 && (
                            <Circle className="absolute -top-1 -right-1 h-4 w-4 fill-primary text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {conv.other_user.full_name || conv.other_user.display_id}
                            </p>
                            {conv.last_message_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.last_message_at), {
                                  addSuffix: false,
                                  locale: isRTL ? ar : enUS
                                })}
                              </span>
                            )}
                          </div>
                          {conv.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message.sender_id === user.id && (isRTL ? 'أنت: ' : 'You: ')}
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className={cn(
            "md:col-span-2 flex flex-col",
            !conversationId && "hidden md:flex"
          )}>
            {conversationId && selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => navigate('/messages')}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Link to={`/user/${selectedConversation.other_user.user_id}`} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedConversation.other_user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(selectedConversation.other_user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {selectedConversation.other_user.full_name || selectedConversation.other_user.display_id}
                        </p>
                      </div>
                    </Link>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {loadingMessages ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={cn("flex", i % 2 === 0 && "justify-end")}>
                            <Skeleton className="h-12 w-48 rounded-2xl" />
                          </div>
                        ))}
                      </div>
                    ) : messages?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {isRTL ? 'ابدأ المحادثة' : 'Start the conversation'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages?.map((msg, idx) => {
                          const isMine = msg.sender_id === user.id;
                          const showDate = idx === 0 || 
                            new Date(msg.created_at).toDateString() !== 
                            new Date(messages[idx - 1].created_at).toDateString();
                          
                          return (
                            <React.Fragment key={msg.id}>
                              {showDate && (
                                <div className="text-center text-xs text-muted-foreground my-4">
                                  {format(new Date(msg.created_at), 'PPP', { locale: isRTL ? ar : enUS })}
                                </div>
                              )}
                              <div className={cn("flex", isMine && "justify-end")}>
                                <div
                                  className={cn(
                                    "max-w-[70%] rounded-2xl px-4 py-2",
                                    isMine 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted"
                                  )}
                                >
                                  <p className="break-words">{msg.content}</p>
                                  <p className={cn(
                                    "text-xs mt-1",
                                    isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}>
                                    {format(new Date(msg.created_at), 'p', { locale: isRTL ? ar : enUS })}
                                  </p>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessage.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{isRTL ? 'اختر محادثة للبدء' : 'Select a conversation to start'}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;