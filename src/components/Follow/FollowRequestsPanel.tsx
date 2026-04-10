import React from 'react';
import { useFollowRequests, useRespondToRequest } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, UserPlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface FollowRequestsPanelProps {
  className?: string;
}

const FollowRequestsPanel: React.FC<FollowRequestsPanelProps> = ({ className }) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { data: requests, isLoading } = useFollowRequests();
  const respondToRequest = useRespondToRequest();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRespond = (requestId: string, accept: boolean) => {
    respondToRequest.mutate({ requestId, accept });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {isRTL ? 'طلبات المتابعة' : 'Follow Requests'}
          </CardTitle>
          <Badge variant="secondary">{requests.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request: any) => (
          <div
            key={request.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
              isRTL && 'flex-row-reverse'
            )}
          >
            <Link to={`/user/${request.requester_id}`}>
              <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                <AvatarImage src={request.requester?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(request.requester?.full_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
              <Link to={`/user/${request.requester_id}`} className="hover:underline">
                <p className="font-medium truncate">
                  {request.requester?.full_name || request.requester?.display_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{request.requester?.display_id}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(request.created_at), {
                  addSuffix: true,
                  locale: isRTL ? ar : enUS,
                })}
              </p>
            </div>

            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleRespond(request.id, true)}
                disabled={respondToRequest.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond(request.id, false)}
                disabled={respondToRequest.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FollowRequestsPanel;
