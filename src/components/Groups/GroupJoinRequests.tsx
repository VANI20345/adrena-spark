import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface JoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  message?: string;
  full_name?: string;
  avatar_url?: string;
}

interface GroupJoinRequestsProps {
  groupId: string;
  isAdmin: boolean;
}

export const GroupJoinRequests: React.FC<GroupJoinRequestsProps> = ({ groupId, isAdmin }) => {
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
    }
  }, [groupId, isAdmin]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*')
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

          return {
            ...request,
            full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
            avatar_url: profile?.avatar_url
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

      // Add user to group members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Update request status
      const { error: requestError } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);

      if (requestError) throw requestError;

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

      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
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

      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: isRTL ? 'تم الرفض' : 'Rejected',
        description: isRTL ? 'تم رفض طلب الانضمام' : 'Join request rejected'
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل رفض الطلب' : 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          {isRTL ? 'طلبات الانضمام' : 'Join Requests'}
          {requests.length > 0 && (
            <Badge variant="default">{requests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.avatar_url} />
                    <AvatarFallback>{request.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{request.full_name}</div>
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
                <div className="flex gap-2">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
