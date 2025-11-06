import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupChatPro } from '@/components/Groups/GroupChatPro';
import Navbar from '@/components/Layout/Navbar';
import { ArrowLeft } from 'lucide-react';

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  joined_at: string;
  full_name?: string;
}

interface GroupInfo {
  id: string;
  group_name: string;
  group_type: string;
  current_members: number;
  max_members: number;
  created_by: string;
  event_id?: string;
}

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user) return;
    loadGroupData();
  }, [groupId, user]);

  const loadGroupData = async () => {
    if (!groupId || !user) return;

    try {
      setIsLoading(true);

      // Load group info
      const { data: groupData, error: groupError } = await supabase
        .from('event_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Load members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Fetch profile names for all members
      const membersWithNames = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', member.user_id)
            .single();

          return {
            ...member,
            full_name: profile?.full_name || 'مستخدم'
          };
        })
      );

      setMembers(membersWithNames);

      // Find current user's membership
      const myMembership = membersWithNames.find(m => m.user_id === user.id);
      setCurrentMember(myMembership || null);

    } catch (error) {
      console.error('Error loading group data:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل بيانات المجموعة',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentMember || !user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', currentMember.id);

      if (error) throw error;

      // Update member count
      if (group) {
        await supabase
          .from('event_groups')
          .update({ current_members: Math.max(0, group.current_members - 1) })
          .eq('id', groupId!);
      }

      toast({
        title: 'تم بنجاح',
        description: 'تم مغادرة المجموعة'
      });

      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء مغادرة المجموعة',
        variant: 'destructive'
      });
    }
  };

  const handleToggleMute = async () => {
    if (!currentMember) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_muted: !currentMember.is_muted })
        .eq('id', currentMember.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: currentMember.is_muted ? 'تم إلغاء الكتم' : 'تم كتم الإشعارات'
      });

      loadGroupData();
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الإعدادات',
        variant: 'destructive'
      });
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!group || !currentMember) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">لم يتم العثور على المجموعة أو أنت لست عضواً فيها</p>
            <Button onClick={() => navigate('/groups')}>العودة للمجموعات</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/groups')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          العودة للمجموعات
        </Button>

        <div className="h-[calc(100vh-12rem)] rounded-lg border shadow-lg overflow-hidden bg-card">
          <GroupChatPro
            groupId={group.id}
            groupName={group.group_name}
            groupType={group.group_type}
            currentMembers={group.current_members}
            maxMembers={group.max_members}
            members={members}
            currentMember={currentMember}
            onMembersUpdate={loadGroupData}
            onToggleMute={handleToggleMute}
            onLeaveGroup={handleLeaveGroup}
          />
        </div>
      </main>
    </div>
  );
};

export default GroupDetails;
