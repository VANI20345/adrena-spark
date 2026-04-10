import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NewInquiryDropdown } from '@/components/Tickets/NewInquiryDropdown';
import { ResolveTicketButton } from '@/components/Tickets/ResolveTicketButton';
import { 
  MessageSquare, 
  Users, 
  GraduationCap, 
  HelpCircle,
  ChevronRight,
  Loader2,
  Calendar,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Search,
  MessageCircle,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Status color config
const statusConfig: Record<string, { 
  color: string; 
  bgColor: string; 
  label: string; 
  labelAr: string;
  icon: React.ReactNode;
}> = {
  open: { 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300', 
    label: 'Open', 
    labelAr: 'مفتوح',
    icon: <Clock className="w-3 h-3" />
  },
  replied: { 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300', 
    label: 'Replied', 
    labelAr: 'تم الرد',
    icon: <MessageSquare className="w-3 h-3" />
  },
  resolved: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-300', 
    label: 'Resolved', 
    labelAr: 'محلول',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  disputed: { 
    color: 'text-red-600', 
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300', 
    label: 'Disputed', 
    labelAr: 'متنازع',
    icon: <HelpCircle className="w-3 h-3" />
  }
};

interface SupportTicket {
  id: string;
  user_id: string;
  ticket_type: string;
  entity_type: string | null;
  entity_id: string | null;
  target_user_id: string | null;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_sent: boolean;
  sender_name?: string;
  target_name?: string;
  is_unread?: boolean;
  last_message_sender_id?: string;
}

const Messages = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('open');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRTL = language === 'ar';

  // Get ticket ID from URL
  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId) {
      setSelectedTicketId(ticketId);
    }
  }, [searchParams]);

  // Fetch all tickets - both sent by user AND received by user (as target)
  // With unread status tracking
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['user-messages-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch tickets where user is sender OR target
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Fetch user names for tickets
      const userIds = new Set<string>();
      data.forEach(ticket => {
        if (ticket.user_id) userIds.add(ticket.user_id);
        if (ticket.target_user_id) userIds.add(ticket.target_user_id);
      });
      
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Fetch the last message for each ticket to determine unread status
      const ticketIds = data.map(t => t.id);
      const { data: lastMessages } = await supabase
        .from('ticket_messages')
        .select('ticket_id, sender_id, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false });
      
      // Group by ticket_id and get the latest message per ticket
      const latestPerTicket = new Map<string, { sender_id: string; created_at: string }>();
      (lastMessages || []).forEach(msg => {
        if (!latestPerTicket.has(msg.ticket_id)) {
          latestPerTicket.set(msg.ticket_id, msg);
        }
      });
      
      // Map tickets with sent/received indicator and unread status
      const mappedTickets = data.map(ticket => {
        const lastMsg = latestPerTicket.get(ticket.id);
        const is_unread = lastMsg ? lastMsg.sender_id !== user.id : false;
        
        return {
          ...ticket,
          is_sent: ticket.user_id === user.id,
          sender_name: profilesMap.get(ticket.user_id)?.full_name,
          target_name: profilesMap.get(ticket.target_user_id)?.full_name,
          is_unread,
          last_message_sender_id: lastMsg?.sender_id,
        };
      }) as SupportTicket[];
      
      // Sort: unread first, then by updated_at
      return mappedTickets.sort((a, b) => {
        // Unread messages first
        if (a.is_unread && !b.is_unread) return -1;
        if (!a.is_unread && b.is_unread) return 1;
        // Then by updated_at (most recent first)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    },
    enabled: !!user?.id,
    staleTime: 10 * 1000, // Faster refresh for real-time feel
  });

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId);
  
  // Fetch messages for selected ticket
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ticket-messages', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return [];
      
      // First fetch messages
      const { data: messagesData, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (!messagesData || messagesData.length === 0) return [];
      
      // Fetch sender profiles separately since sender_id FK points to auth.users, not profiles
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return messagesData.map(msg => ({
        ...msg,
        profiles: profilesMap.get(msg.sender_id) || null
      }));
    },
    enabled: !!selectedTicketId,
    staleTime: 30 * 1000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message: message.trim()
        });
      
      if (msgError) throw msgError;
      
      // Update ticket status
      await supabase
        .from('support_tickets')
        .update({ status: 'replied', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['user-messages-tickets'] });
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getTicketIcon = (type: string) => {
    switch (type) {
      case 'group_inquiry': return <Users className="h-4 w-4" />;
      case 'training_inquiry': return <GraduationCap className="h-4 w-4" />;
      case 'event_inquiry': return <Calendar className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.open;
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'gap-1 border transition-all text-xs',
          config.bgColor,
          config.color
        )}
      >
        {config.icon}
        {isRTL ? config.labelAr : config.label}
      </Badge>
    );
  };

  // Separate open/active tickets from closed ones
  const openTickets = tickets?.filter(t => t.status !== 'resolved') || [];
  const closedTickets = tickets?.filter(t => t.status === 'resolved') || [];
  
  const filteredTickets = (activeTab === 'closed' ? closedTickets : openTickets).filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setSearchParams({ id: ticketId });
  };

  const handleBack = () => {
    setSelectedTicketId(null);
    setSearchParams({});
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    
    try {
      await sendMessageMutation.mutateAsync({ ticketId: selectedTicketId, message: replyMessage });
      setReplyMessage('');
      toast.success(isRTL ? 'تم إرسال الرد' : 'Reply sent');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      toast.error(isRTL ? 'فشل إرسال الرد' : 'Failed to send reply');
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 lg:py-8 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-6 flex-shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isRTL ? 'الرسائل' : 'Messages'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRTL ? `${filteredTickets.length} محادثة` : `${filteredTickets.length} conversations`}
              </p>
            </div>
          </div>
          
          {/* Create New Inquiry Dropdown */}
          <NewInquiryDropdown />
        </motion.div>

        {/* Split View Layout - flex-1 to fill remaining space, min-h-0 to allow shrinking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
          {/* Messages List - Left Panel */}
          <motion.div 
            className={cn(
              "lg:col-span-4 flex flex-col",
              selectedTicketId && "hidden lg:flex"
            )}
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                isRTL ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(isRTL ? "pr-9" : "pl-9")}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full mb-4 h-12 grid grid-cols-2">
                <TabsTrigger value="open" className="text-xs sm:text-sm gap-1">
                  <Clock className="h-3 w-3" />
                  {isRTL ? 'المفتوحة' : 'Open'}
                  {openTickets.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                      {openTickets.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="closed" className="text-xs sm:text-sm gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {isRTL ? 'المغلقة' : 'Resolved'}
                  {closedTickets.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                      {closedTickets.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Card className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {filteredTickets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>{isRTL ? 'لا توجد رسائل' : 'No messages found'}</p>
                        <p className="text-sm mt-2">{isRTL ? 'استخدم زر "استفسار جديد" للبدء' : 'Use the "New Inquiry" button to start'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AnimatePresence>
                          {filteredTickets.map((ticket, index) => (
                            <motion.div
                              key={ticket.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={cn(
                                "p-4 rounded-xl cursor-pointer transition-all border relative",
                                selectedTicketId === ticket.id
                                  ? "bg-primary/10 border-primary/30"
                                  : ticket.is_unread
                                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                    : "hover:bg-muted/50 border-transparent hover:border-border"
                              )}
                              onClick={() => handleSelectTicket(ticket.id)}
                            >
                              {/* Unread indicator badge */}
                              {ticket.is_unread && (
                                <div className="absolute top-2 end-2">
                                  <Badge 
                                    variant="default" 
                                    className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {isRTL ? 'جديد' : 'New'}
                                  </Badge>
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg flex-shrink-0 relative",
                                  selectedTicketId === ticket.id ? "bg-primary/20" : 
                                    ticket.is_unread ? "bg-primary/15" : "bg-muted"
                                )}>
                                  {getTicketIcon(ticket.ticket_type)}
                                  {/* Sent/Received indicator */}
                                  <div className={cn(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white",
                                    ticket.is_sent ? "bg-blue-500" : "bg-green-500"
                                  )}>
                                    {ticket.is_sent ? (
                                      <ArrowUpRight className="h-2.5 w-2.5" />
                                    ) : (
                                      <ArrowDownLeft className="h-2.5 w-2.5" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className={cn(
                                    "truncate text-sm",
                                    ticket.is_unread ? "font-bold" : "font-medium"
                                  )}>{ticket.subject}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {ticket.is_sent 
                                      ? (isRTL ? `إلى: ${ticket.target_name || 'غير محدد'}` : `To: ${ticket.target_name || 'Unknown'}`)
                                      : (isRTL ? `من: ${ticket.sender_name || 'غير محدد'}` : `From: ${ticket.sender_name || 'Unknown'}`)
                                    }
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {getStatusBadge(ticket.status)}
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(ticket.updated_at), { 
                                        addSuffix: true,
                                        locale: isRTL ? ar : enUS 
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className={cn(
                                  "h-4 w-4 text-muted-foreground flex-shrink-0 mt-1",
                                  isRTL && "rotate-180"
                                )} />
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </Tabs>
          </motion.div>

          {/* Message Thread - Right Panel */}
          <motion.div 
            className={cn(
              "lg:col-span-8 flex flex-col",
              !selectedTicketId && "hidden lg:flex"
            )}
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="flex-1 flex flex-col overflow-hidden">
              {selectedTicket ? (
                <>
                  {/* Thread Header */}
                  <CardHeader className="border-b py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="lg:hidden"
                        onClick={handleBack}
                      >
                        <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                      </Button>
                      <div className={cn(
                        "p-2 rounded-lg relative",
                        statusConfig[selectedTicket.status]?.bgColor || "bg-muted"
                      )}>
                        {getTicketIcon(selectedTicket.ticket_type)}
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white",
                          selectedTicket.is_sent ? "bg-blue-500" : "bg-green-500"
                        )}>
                          {selectedTicket.is_sent ? (
                            <ArrowUpRight className="h-2.5 w-2.5" />
                          ) : (
                            <ArrowDownLeft className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusBadge(selectedTicket.status)}
                          <Badge variant="outline" className="text-xs">
                            {selectedTicket.is_sent 
                              ? (isRTL ? `إلى: ${selectedTicket.target_name}` : `To: ${selectedTicket.target_name}`)
                              : (isRTL ? `من: ${selectedTicket.sender_name}` : `From: ${selectedTicket.sender_name}`)
                            }
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(selectedTicket.created_at), 'PPp', { 
                              locale: isRTL ? ar : enUS 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages - Scrollable container */}
                  <ScrollArea className="flex-1 min-h-0">
                    {messagesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4 p-4">
                        {messages?.map((msg: any, index: number) => {
                          const isOwn = msg.sender_id === user?.id;
                          const isFromTargetUser = msg.sender_id === selectedTicket.target_user_id;
                          const isVerifiedReply = isFromTargetUser && !isOwn;
                          
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={cn(
                                "flex gap-3",
                                isOwn && "flex-row-reverse"
                              )}
                            >
                              <div className="relative">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={msg.profiles?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {msg.profiles?.full_name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                {/* Verified badge for target user */}
                                {isVerifiedReply && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-3",
                                isOwn 
                                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                  : isVerifiedReply
                                    ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-tl-sm"
                                    : "bg-muted rounded-tl-sm"
                              )}>
                                {/* Verified Reply Badge */}
                                {isVerifiedReply && (
                                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    {isRTL ? 'رد موثق' : 'Verified Reply'}
                                  </div>
                                )}
                                <p className={cn(
                                  "text-sm whitespace-pre-wrap",
                                  isVerifiedReply && !isOwn && "text-foreground"
                                )}>{msg.message}</p>
                                <p className={cn(
                                  "text-[10px] mt-1.5",
                                  isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}>
                                  {format(new Date(msg.created_at), 'p', { 
                                    locale: isRTL ? ar : enUS 
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Reply Input & Actions */}
                  {selectedTicket.status !== 'resolved' && (
                    <div className="border-t p-4 flex-shrink-0 space-y-3">
                      <div className="flex gap-3">
                        <Textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder={isRTL ? 'اكتب ردك...' : 'Type your reply...'}
                          className="min-h-[60px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                        />
                        <Button 
                          size="icon" 
                          className="h-[60px] w-[60px]"
                          onClick={handleSendReply}
                          disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className={cn("h-5 w-5", isRTL && "rotate-180")} />
                          )}
                        </Button>
                      </div>
                      
                      {/* Resolve Button - Only for target user, 24h after their last reply */}
                      <ResolveTicketButton 
                        ticket={selectedTicket} 
                        messages={messages || []} 
                        userId={user?.id}
                        onResolve={() => {
                          queryClient.invalidateQueries({ queryKey: ['user-messages-tickets'] });
                          queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicketId] });
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">
                      {isRTL ? 'اختر محادثة' : 'Select a conversation'}
                    </p>
                    <p className="text-sm mt-1 opacity-70">
                      {isRTL ? 'اختر محادثة من القائمة للبدء' : 'Choose a conversation from the list to start'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;