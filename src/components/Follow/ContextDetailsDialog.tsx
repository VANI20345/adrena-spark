import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Users2, UserCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SharedGroupInfo {
  group_id: string;
  group_name: string;
}

interface MutualFollower {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_id?: string;
}

interface ContextDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'groups' | 'followers';
  sharedGroups?: SharedGroupInfo[];
  mutualFollowers?: MutualFollower[];
  userName?: string;
}

export const ContextDetailsDialog: React.FC<ContextDetailsDialogProps> = ({
  open,
  onOpenChange,
  type,
  sharedGroups = [],
  mutualFollowers = [],
  userName = '',
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const navigate = useNavigate();

  const handleGroupClick = (groupId: string) => {
    onOpenChange(false);
    navigate(`/groups/${groupId}`);
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/user/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            {type === 'groups' ? (
              <>
                <Users2 className="h-5 w-5 text-primary" />
                {isRTL 
                  ? `المجموعات المشتركة مع ${userName}`
                  : `Shared groups with ${userName}`
                }
              </>
            ) : (
              <>
                <UserCheck className="h-5 w-5 text-primary" />
                {isRTL 
                  ? `متابعون مشتركون مع ${userName}`
                  : `Mutual followers with ${userName}`
                }
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {type === 'groups' ? (
            sharedGroups.length > 0 ? (
              sharedGroups.map((group) => (
                <button
                  key={group.group_id}
                  onClick={() => handleGroupClick(group.group_id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-start",
                    isRTL && "flex-row-reverse text-end"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.group_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'انقر للعرض' : 'Click to view'}
                    </p>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{isRTL ? 'لا توجد مجموعات مشتركة' : 'No shared groups'}</p>
              </div>
            )
          ) : (
            mutualFollowers.length > 0 ? (
              mutualFollowers.map((follower) => (
                <button
                  key={follower.user_id}
                  onClick={() => handleUserClick(follower.user_id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-start",
                    isRTL && "flex-row-reverse text-end"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={follower.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {follower.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{follower.full_name || 'User'}</p>
                    {follower.display_id && (
                      <p className="text-xs text-muted-foreground">@{follower.display_id}</p>
                    )}
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{isRTL ? 'لا يوجد متابعون مشتركون' : 'No mutual followers'}</p>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
