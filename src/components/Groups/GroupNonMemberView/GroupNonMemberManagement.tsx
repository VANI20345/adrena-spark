import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Member {
  id: string;
  role: string;
  profiles?: {
    avatar_url?: string;
    full_name?: string;
  };
}

interface GroupNonMemberManagementProps {
  members: Member[];
  isRTL: boolean;
}

export const GroupNonMemberManagement: React.FC<GroupNonMemberManagementProps> = ({ 
  members, 
  isRTL 
}) => {
  const owner = members.find(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');

  return (
    <div>
      <h4 className="font-medium mb-3">
        {isRTL ? 'إدارة المجموعة' : 'Group Management'}
      </h4>
      <div className="space-y-3">
        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={owner.profiles?.avatar_url} />
              <AvatarFallback>{owner.profiles?.full_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{owner.profiles?.full_name || (isRTL ? 'مستخدم' : 'User')}</p>
              <Badge variant="default" className="text-xs">
                {isRTL ? 'مالك المجموعة' : 'Owner'}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Admins */}
        {admins.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {isRTL ? 'المشرفون' : 'Admins'}
            </p>
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={admin.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {admin.profiles?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm">{admin.profiles?.full_name || (isRTL ? 'مستخدم' : 'User')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
