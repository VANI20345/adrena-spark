import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';

interface ResolveTicketButtonProps {
  ticket: {
    id: string;
    user_id: string;
    target_user_id: string | null;
    status: string;
  };
  messages: Array<{
    id: string;
    sender_id: string;
    created_at: string;
  }>;
  userId?: string;
  onResolve: () => void;
}

export const ResolveTicketButton: React.FC<ResolveTicketButtonProps> = ({
  ticket,
  messages,
  userId,
  onResolve
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  // Check if current user is the target user (the one who should respond)
  const isTargetUser = userId === ticket.target_user_id;
  
  // Find the last message sent by the target user
  const lastTargetUserMessage = [...messages]
    .reverse()
    .find(msg => msg.sender_id === ticket.target_user_id);
  
  // Calculate hours since last reply by target user
  const hoursSinceLastReply = lastTargetUserMessage 
    ? differenceInHours(new Date(), new Date(lastTargetUserMessage.created_at))
    : 0;
  
  // Target user can only resolve after 24 hours from their last reply
  const canResolve = isTargetUser && lastTargetUserMessage && hoursSinceLastReply >= 24;
  const hoursRemaining = 24 - hoursSinceLastReply;

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم إغلاق التذكرة' : 'Ticket resolved');
      onResolve();
    },
    onError: () => {
      toast.error(isRTL ? 'فشل إغلاق التذكرة' : 'Failed to resolve ticket');
    }
  });

  // Only show for target user who has replied
  if (!isTargetUser || !lastTargetUserMessage) {
    return null;
  }

  if (ticket.status === 'resolved') {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full gap-2",
                canResolve 
                  ? "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700" 
                  : "text-muted-foreground cursor-not-allowed opacity-60"
              )}
              disabled={!canResolve || resolveMutation.isPending}
              onClick={() => canResolve && resolveMutation.mutate()}
            >
              {canResolve ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isRTL ? 'إغلاق التذكرة' : 'Resolve Ticket'}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  {isRTL ? 'يمكنك الإغلاق بعد 24 ساعة' : 'Can resolve after 24h'}
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        {!canResolve && (
          <TooltipContent>
            <p>
              {isRTL 
                ? `يمكنك إغلاق هذه التذكرة بعد ${Math.max(0, Math.ceil(hoursRemaining))} ساعة من آخر رد لك`
                : `You can close this ticket ${Math.max(0, Math.ceil(hoursRemaining))} hours after your last response`
              }
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};