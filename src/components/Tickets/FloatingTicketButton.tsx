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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "fixed bottom-6 z-50",
              isRTL ? "left-6" : "right-6",
              className
            )}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
            >
              {/* Single pulse animation ring - clean animation without duplicates */}
              {hasNewMessages && (
                <motion.span 
                  className="absolute inset-0 rounded-full bg-primary/30 pointer-events-none -z-10"
                  animate={{
                    scale: [1, 1.6],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    repeatDelay: 0.5,
                  }}
                />
              )}
              
              {/* Unread badge - positioned absolutely outside the button flow */}
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute -top-2 -right-2 z-10"
                  >
                    <Badge 
                      className="h-6 min-w-[24px] px-1.5 bg-destructive text-destructive-foreground text-xs font-bold border-2 border-background shadow-md flex items-center justify-center"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                onClick={() => navigate('/messages')}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "relative h-14 rounded-full shadow-lg flex items-center justify-center",
                  "bg-gradient-to-r from-primary to-primary/80",
                  "text-primary-foreground font-medium",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                )}
                style={{ minWidth: 56 }}
                animate={{
                  width: isHovered ? 'auto' : 56,
                  paddingLeft: isHovered ? 20 : 0,
                  paddingRight: isHovered ? 20 : 0,
                  boxShadow: isHovered 
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                }}
                transition={{
                  width: { type: 'spring', stiffness: 300, damping: 25 },
                  paddingLeft: { type: 'spring', stiffness: 300, damping: 25 },
                  paddingRight: { type: 'spring', stiffness: 300, damping: 25 },
                  boxShadow: { duration: 0.2, ease: 'easeOut' },
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  className="flex items-center justify-center"
                  animate={{
                    marginRight: isHovered ? 8 : 0
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25
                  }}
                >
                  <MessageSquare className="h-6 w-6 flex-shrink-0" />
                </motion.div>
                
                <AnimatePresence mode="wait">
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{
                        opacity: { duration: 0.15, ease: 'easeOut' },
                        width: { type: 'spring', stiffness: 300, damping: 25 }
                      }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {isRTL ? 'الرسائل' : 'Messages'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </div>
        </TooltipTrigger>
        <TooltipContent side={isRTL ? 'right' : 'left'} sideOffset={8}>
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
