import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FloatingTicketButtonProps {
  className?: string;
}

export const FloatingTicketButton: React.FC<FloatingTicketButtonProps> = ({ className }) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Fetch unread ticket count - tickets with unread messages
  const { data: unreadData } = useQuery({
    queryKey: ['unread-tickets-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, hasNewMessages: false };

      // Get all tickets where user is sender or target with open/replied status
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, user_id, target_user_id, status')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .in('status', ['open', 'replied']);

      if (!tickets || tickets.length === 0) return { count: 0, hasNewMessages: false };

      // For each ticket, check if the last message is from someone other than current user
      const ticketIds = tickets.map(t => t.id);
      
      // Get the last message for each ticket
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

      // Count tickets where last message is not from current user
      let unreadCount = 0;
      tickets.forEach(ticket => {
        const lastMsg = latestPerTicket.get(ticket.id);
        if (lastMsg && lastMsg.sender_id !== user.id) {
          unreadCount++;
        }
      });

      return { 
        count: unreadCount, 
        hasNewMessages: unreadCount > 0 
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const unreadCount = unreadData?.count || 0;
  const hasNewMessages = unreadData?.hasNewMessages || false;

  // Subscribe to real-time updates for ticket messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('ticket-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages'
        },
        () => {
          // Invalidate the query to refetch unread count
          queryClient.invalidateQueries({ queryKey: ['unread-tickets-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (!user) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              "fixed bottom-6 z-50",
              isRTL ? "left-6" : "right-6",
              className
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <Button
              onClick={() => navigate('/messages')}
              size="lg"
              className={cn(
                "relative h-14 rounded-full shadow-lg",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:shadow-xl hover:scale-105 transition-all duration-300",
                isHovered ? "px-6 gap-2" : "w-14 px-0"
              )}
            >
              <MessageSquare className={cn("h-6 w-6", isHovered && "h-5 w-5")} />
              
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden font-medium"
                  >
                    {isRTL ? 'الرسائل' : 'Messages'}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Unread badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1"
                >
                  <Badge 
                    className="h-5 min-w-[20px] px-1.5 bg-red-500 text-white text-xs font-bold border-2 border-background"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                </motion.div>
              )}

              {/* Pulse animation for new messages - only shows when there are unread messages */}
              {hasNewMessages && (
                <motion.span 
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 0, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side={isRTL ? 'right' : 'left'}>
          <p>{isRTL ? 'عرض الرسائل والتذاكر' : 'View Messages & Tickets'}</p>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? `${unreadCount} رسائل جديدة` : `${unreadCount} new messages`}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};