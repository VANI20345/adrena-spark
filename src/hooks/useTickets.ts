import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserTickets() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          ticket_messages(count)
        `)
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTicketMessages(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      // First fetch messages
      const { data: messagesData, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
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
    enabled: !!ticketId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSendTicketMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // First, get the ticket to check who the target user is
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('user_id, target_user_id, status')
        .eq('id', ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      if (!ticket) throw new Error('Ticket not found');
      
      // Send message
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message: message.trim()
        });
      
      if (msgError) throw msgError;
      
      // Determine new status based on who is replying
      // Only change to 'replied' if the TARGET user (the one being asked) replies
      // If the original sender replies, keep as 'open' (or mark as 'open' if it was 'replied')
      let newStatus = ticket.status;
      
      if (user.id === ticket.target_user_id) {
        // Target user is replying - mark as 'replied'
        newStatus = 'replied';
        
        // Create notification for the original ticket creator
        await supabase
          .from('notifications')
          .insert({
            user_id: ticket.user_id,
            type: 'ticket_reply',
            title: 'New Reply',
            message: 'You have received a reply to your ticket',
            data: { ticket_id: ticketId }
          });
      } else if (user.id === ticket.user_id) {
        // Original sender is replying - mark as 'open' (awaiting response)
        newStatus = 'open';
        
        // Create notification for the target user
        if (ticket.target_user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: ticket.target_user_id,
              type: 'ticket_message',
              title: 'New Message',
              message: 'You have received a new message on a ticket',
              data: { ticket_id: ticketId }
            });
        }
      }
      
      // Update ticket status
      await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
    }
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
    }
  });
}
