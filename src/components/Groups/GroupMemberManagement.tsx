import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Users, UserPlus, UserMinus, Volume, VolumeX, Shield, Trash2 } from 'lucide-react';

interface GroupMember {
  id: string;
  user_id: string;
  joined_at: string;
  is_muted: boolean;
  role: string;
  profiles?: {
    full_name: string;
  };
}

interface GroupMemberManagementProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export const GroupMemberManagement: React.FC<GroupMemberManagementProps> = ({
  groupId,
  groupName,
  isOwner
}) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load group members
  const { data: members = [], refetch: refetchMembers } = useSupabaseQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return (data || []) as GroupMember[];
    }
  });

  // Join group mutation
  const joinGroupMutation = useSupabaseMutation(
    async () => {
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user?.id,
        });

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: t('success', 'تم بنجاح!'),
          description: t('joinedGroup', 'تم الانضمام للمجموعة'),
        });
        refetchMembers();
      }
    }
  );

  // Leave group mutation
  const leaveGroupMutation = useSupabaseMutation(
    async () => {
      const { data, error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;
      return { data, error: null };
    },
    {
      onSuccess: () => {
        toast({
          title: t('success', 'تم بنجاح!'),
          description: t('leftGroup', 'تم مغادرة المجموعة'),
        });
        refetchMembers();
      }
    }
  );

  // Mute/unmute member mutation
  const toggleMuteMutation = useSupabaseMutation(
    async (memberId: string) => {
      const member = members.find(m => m.id === memberId);
      const { data, error } = await supabase
        .from('group_members')
        .update({ is_muted: !member?.is_muted })
        .eq('id', memberId);

      if (error) throw error;
      return { data, error: null };
    },
    {
      onSuccess: () => {
        toast({
          title: t('success', 'تم بنجاح!'),
          description: t('memberUpdated', 'تم تحديث حالة العضو'),
        });
        refetchMembers();
      }
    }
  );

  // Remove member mutation
  const removeMemberMutation = useSupabaseMutation(
    async (memberId: string) => {
      const { data, error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      return { data, error: null };
    },
    {
      onSuccess: () => {
        toast({
          title: t('success', 'تم بنجاح!'),
          description: t('memberRemoved', 'تم إزالة العضو'),
        });
        refetchMembers();
      }
    }
  );

  const isUserMember = members.some(member => member.user_id === user?.id);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          الأعضاء ({members.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أعضاء {groupName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Join/Leave controls */}
          <div className="flex gap-2">
            {!isUserMember ? (
              <Button 
                onClick={() => joinGroupMutation.mutate(undefined)}
                disabled={joinGroupMutation.isLoading}
                className="flex-1 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {joinGroupMutation.isLoading ? t('joining', 'جاري الانضمام...') : t('joinGroup', 'انضم للمجموعة')}
              </Button>
            ) : (
              <Button 
                onClick={() => leaveGroupMutation.mutate(undefined)}
                disabled={leaveGroupMutation.isLoading}
                variant="outline"
                className="flex-1 gap-2"
              >
                <UserMinus className="h-4 w-4" />
                {leaveGroupMutation.isLoading ? t('leaving', 'جاري المغادرة...') : t('leaveGroup', 'مغادرة المجموعة')}
              </Button>
            )}
          </div>

          {/* Members list */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {t('member', 'عضو')} #{member.id.slice(-4)}
                      </p>
                      <div className="flex items-center gap-1">
                        {member.role === 'admin' && (
                          <Badge variant="default" className="text-xs">
                            <Shield className="h-3 w-3 ml-1" />
                            منظم
                          </Badge>
                        )}
                        {member.is_muted && (
                          <Badge variant="secondary" className="text-xs">
                            <VolumeX className="h-3 w-3 ml-1" />
                            مكتوم
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOwner && member.user_id !== user?.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleMuteMutation.mutate(member.id)}
                        disabled={toggleMuteMutation.isLoading}
                      >
                        {member.is_muted ? (
                          <Volume className="h-3 w-3" />
                        ) : (
                          <VolumeX className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        disabled={removeMemberMutation.isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {members.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noMembers', 'لا يوجد أعضاء في المجموعة')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupMemberManagement;