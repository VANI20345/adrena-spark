import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Clock } from 'lucide-react';

interface GroupNonMemberActionsProps {
  visibility: string;
  requiresApproval: boolean;
  hasPendingRequest: boolean;
  isLoading: boolean;
  onJoinClick: () => void;
  isRTL: boolean;
}

export const GroupNonMemberActions: React.FC<GroupNonMemberActionsProps> = ({
  visibility,
  requiresApproval,
  hasPendingRequest,
  isLoading,
  onJoinClick,
  isRTL
}) => {
  return (
    <div className="border-t pt-4">
      {hasPendingRequest ? (
        <Button disabled className="w-full" size="lg">
          <Clock className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'في انتظار الموافقة' : 'Request Pending'}
        </Button>
      ) : (
        <Button 
          onClick={onJoinClick}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <UserPlus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {visibility === 'private' || requiresApproval
            ? (isRTL ? 'طلب الانضمام' : 'Request to Join')
            : (isRTL ? 'انضم للمجموعة' : 'Join Group')}
        </Button>
      )}
    </div>
  );
};
