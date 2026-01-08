import React, { useState, useEffect, useCallback } from 'react';
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
  const { data: unreadData, refetch } = useQuery({
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
    staleTime: 10 * 1000, // Reduced from 30s to 10s for faster updates
    refetchInterval: 20 * 1000, // Reduced from 60s to 20s
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
          event: '*', // Listen to all events including DELETE/UPDATE
          schema: 'public',
          table: 'ticket_messages'
        },
        () => {
          // Immediately refetch on any change
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          // Also refetch when ticket status changes
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Smooth hover handling with debounce
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

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
          >
            <motion.button
              onClick={() => navigate('/messages')}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "relative h-14 rounded-full shadow-lg flex items-center justify-center",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:shadow-xl transition-shadow duration-300",
                "text-primary-foreground font-medium"
              )}
              animate={{
                width: isHovered ? 'auto' : 56,
                paddingLeft: isHovered ? 20 : 0,
                paddingRight: isHovered ? 20 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{
                  marginRight: isHovered ? 8 : 0
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30
                }}
              >
                <MessageSquare className="h-6 w-6" />
              </motion.div>
              
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30
                    }}
                    className="whitespace-nowrap overflow-hidden"
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

              {/* Single pulse animation for new messages */}
              {hasNewMessages && (
                <motion.span 
                  className="absolute inset-0 rounded-full bg-green-500/40"
                  animate={{
                    scale: [1, 1.5],
                    opacity: [0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              )}
            </motion.button>
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
