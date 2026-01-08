import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, UserPlus, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

interface AdmissionAnswer {
  question: string;
  answer: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  message?: string;
  full_name?: string;
  avatar_url?: string;
  admission_answers?: AdmissionAnswer[] | null;
}

interface JoinRequestsDialogProps {
  groupId: string;
  open: boolean;
  onClose: () => void;
  onRequestHandled?: () => void;
}

export const JoinRequestsDialog: React.FC<JoinRequestsDialogProps> = ({
  groupId,
  open,
  onClose,
  onRequestHandled
}) => {
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [groupId, open]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('id, user_id, created_at, message, admission_answers')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', request.user_id)
            .single();

          // Parse admission_answers if it's a JSON string
          let parsedAnswers: AdmissionAnswer[] | null = null;
          if (request.admission_answers) {
            try {
              if (Array.isArray(request.admission_answers)) {
                parsedAnswers = (request.admission_answers as unknown[]).map((item: unknown) => {
                  const obj = item as { question?: string; answer?: string };
                  return {
                    question: obj.question || '',
                    answer: obj.answer || ''
                  };
                });
              }
            } catch {
              parsedAnswers = null;
            }
          }

          return {
            ...request,
            full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
            avatar_url: profile?.avatar_url,
            admission_answers: parsedAnswers
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    try {
      setProcessingId(requestId);

      // Optimistically remove from UI immediately
      setRequests(prev => prev.filter(req => req.id !== requestId));

      // Get current user for reviewed_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Update the request status FIRST
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id || null
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        throw updateError;
      }

      // Add user to group members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        throw memberError;
      }

      // Update group member count
      const { data: groupData } = await supabase
        .from('event_groups')
        .select('current_members')
        .eq('id', groupId)
        .single();

      if (groupData) {
        await supabase
          .from('event_groups')
          .update({ current_members: (groupData.current_members || 0) + 1 })
          .eq('id', groupId);
      }

      toast({
        title: isRTL ? 'تمت الموافقة' : 'Approved',
        description: isRTL ? 'تم قبول طلب الانضمام' : 'Join request approved'
      });

      onRequestHandled?.();
    } catch (error) {
      console.error('Error approving request:', error);
      // Reload on error to restore correct state
      loadRequests();
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشلت الموافقة على الطلب' : 'Failed to approve request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId);

      // Optimistically remove from UI immediately
      setRequests(prev => prev.filter(req => req.id !== requestId));

      // Get current user for reviewed_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Update the request status instead of deleting
      const { error } = await supabase
        .from('group_join_requests')
        .update({ 
          status: 'rejected', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الرفض' : 'Rejected',
        description: isRTL ? 'تم رفض طلب الانضمام' : 'Join request rejected'
      });

      onRequestHandled?.();
    } catch (error) {
      console.error('Error rejecting request:', error);
      // Reload on error to restore correct state
      loadRequests();
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل رفض الطلب' : 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {isRTL ? 'طلبات الانضمام' : 'Join Requests'}
            {requests.length > 0 && (
              <Badge variant="default" className="ml-2">{requests.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {isRTL ? 'لا توجد طلبات جديدة' : 'No pending requests'}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-lg bg-muted/50 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.avatar_url} />
                        <AvatarFallback>{request.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-2">
                          {request.full_name}
                          {request.admission_answers && request.admission_answers.length > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <ClipboardList className="w-3 h-3" />
                              {isRTL ? 'إجابات' : 'Answers'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'PPp', {
                            locale: isRTL ? ar : undefined
                          })}
                        </div>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {request.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.admission_answers && request.admission_answers.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                        >
                          {expandedId === request.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request.id, request.user_id)}
                        disabled={processingId === request.id}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Admission Answers Collapsible */}
                  <AnimatePresence>
                    {expandedId === request.id && request.admission_answers && request.admission_answers.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-background/50">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            {isRTL ? 'إجابات الفحص' : 'Screening Answers'}
                          </h4>
                          <div className="space-y-3">
                            {request.admission_answers.map((qa, index) => (
                              <div key={index} className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                  {index + 1}. {qa.question}
                                </p>
                                <p className="text-sm bg-muted p-2 rounded-md">
                                  {qa.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
