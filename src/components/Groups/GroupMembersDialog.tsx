import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, Shield, Search } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useGroupMembers } from '@/hooks/useGroupQueries';
import { cn } from '@/lib/utils';

interface GroupMembersDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onClose: () => void;
}

export const GroupMembersDialog: React.FC<GroupMembersDialogProps> = ({
  groupId,
  groupName,
  open,
  onClose
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  const { data: members = [], isLoading } = useGroupMembers(groupId);

  // Sort members: owner first, then admins, then regular members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return (roleOrder[a.role as keyof typeof roleOrder] || 2) - (roleOrder[b.role as keyof typeof roleOrder] || 2);
  });

  // Filter by search
  const filteredMembers = sortedMembers.filter(member =>
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'owner':
        return {
          icon: <Crown className="w-3 h-3" />,
          label: isRTL ? 'المالك' : 'Owner',
          className: 'bg-amber-500/10 text-amber-600 border-amber-300'
        };
      case 'admin':
        return {
          icon: <Shield className="w-3 h-3" />,
          label: isRTL ? 'مسؤول' : 'Admin',
          className: 'bg-blue-500/10 text-blue-600 border-blue-300'
        };
      default:
        return {
          icon: null,
          label: isRTL ? 'عضو' : 'Member',
          className: 'bg-muted text-muted-foreground'
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span>{isRTL ? 'أعضاء المجموعة' : 'Group Members'}</span>
            <Badge variant="secondary">{members.length}</Badge>
          </DialogTitle>
          <DialogDescription>{groupName}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={isRTL ? 'البحث عن عضو...' : 'Search members...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
          />
        </div>

        <ScrollArea className="flex-1 max-h-[500px] -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>{searchTerm 
                ? (isRTL ? 'لا توجد نتائج' : 'No results found')
                : (isRTL ? 'لا يوجد أعضاء' : 'No members')
              }</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => {
                const roleInfo = getRoleInfo(member.role);
                return (
                  <Link
                    key={member.id}
                    to={`/user/${member.user_id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background group-hover:ring-primary/20 transition-all">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {member.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {member.role === 'owner' && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {member.role === 'admin' && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:text-primary transition-colors truncate">
                        {member.full_name}
                      </p>
                      <Badge variant="outline" className={cn("text-xs mt-1", roleInfo.className)}>
                        {roleInfo.icon}
                        <span className={roleInfo.icon ? (isRTL ? 'mr-1' : 'ml-1') : ''}>
                          {roleInfo.label}
                        </span>
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
