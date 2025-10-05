import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupChat } from '@/components/Groups/GroupChat';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  Users, 
  LogOut, 
  VolumeX, 
  Volume2, 
  Crown,
  Shield,
  ArrowLeft
} from 'lucide-react';

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      owner: { text: 'المالك', variant: 'default' as const },
      admin: { text: 'مشرف', variant: 'secondary' as const },
      moderator: { text: 'مشرف', variant: 'secondary' as const },
      member: { text: 'عضو', variant: 'outline' as const }
    };
    return badges[role as keyof typeof badges] || badges.member;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">جاري التحميل...</div>
        </div>
        <Footer />
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/groups')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          العودة للمجموعات
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group Info & Members */}
          <div className="lg:col-span-1 space-y-4">
            {/* Group Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{group.group_name}</span>
                  <Badge variant="outline">
                    {group.group_type === 'region' ? 'منطقة' : 'فعالية'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">الأعضاء</span>
                  <span className="font-medium">{group.current_members} / {group.max_members}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleToggleMute}
                  >
                    {currentMember.is_muted ? (
                      <>
                        <Volume2 className="w-4 h-4 ml-2" />
                        إلغاء كتم الإشعارات
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 ml-2" />
                        كتم الإشعارات
                      </>
                    )}
                  </Button>

                  {currentMember.role !== 'owner' && (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleLeaveGroup}
                    >
                      <LogOut className="w-4 h-4 ml-2" />
                      مغادرة المجموعة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Users className="w-4 h-4 ml-2" />
                  الأعضاء ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || 'م'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{member.full_name}</span>
                            {getRoleIcon(member.role)}
                          </div>
                          <Badge 
                            variant={getRoleBadge(member.role).variant}
                            className="text-xs"
                          >
                            {getRoleBadge(member.role).text}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <GroupChat 
              groupId={group.id}
              groupName={group.group_name}
              isOwner={currentMember.role === 'owner'}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GroupDetails;
