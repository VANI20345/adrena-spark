import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FriendRequest } from '@/hooks/useFriendRequests';
import { useNavigate } from 'react-router-dom';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  type: 'incoming' | 'outgoing';
  onCancel?: (requestId: string) => void;
}

export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onReject,
  type,
  onCancel
}) => {
  const navigate = useNavigate();
  const userId = type === 'incoming' ? request.sender_id : request.receiver_id;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar 
            className="h-16 w-16 cursor-pointer" 
            onClick={() => navigate(`/profile/${userId}`)}
          >
            <AvatarImage src={request.sender_avatar || undefined} />
            <AvatarFallback>{request.sender_name[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => navigate(`/profile/${userId}`)}
            >
              {request.sender_name}
            </h3>
            {request.sender_city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {request.sender_city}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(request.created_at), { 
                addSuffix: true, 
                locale: ar 
              })}
            </p>
            {request.message && (
              <p className="text-sm mt-2 text-muted-foreground italic">
                "{request.message}"
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {type === 'incoming' ? (
              <>
                <Button
                  size="sm"
                  onClick={() => onAccept(request.id)}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(request.id)}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  رفض
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel?.(request.id)}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};