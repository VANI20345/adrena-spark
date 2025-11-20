import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupPostsFeed } from '@/components/Groups/GroupPostsFeed';
import { GroupDetailsHeader } from '@/components/Groups/GroupDetailsHeader';
import { GroupEventsPreview } from '@/components/Groups/GroupEventsPreview';
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

interface Interest {
  id: string;
  name: string;
  name_ar: string;
}

interface GroupInfo {
  id: string;
  group_name: string;
  current_members: number;
  max_members: number;
  created_by: string;
  event_id?: string;
  image_url?: string;
  interests?: Interest[];
}

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupInfo & { visibility?: string; requires_approval?: boolean } | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRTL = language === 'ar';

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
        .select('*, visibility, requires_approval, cities(name, name_ar)')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Load group interests
      const { data: interestsData } = await supabase
        .from('group_interests')
        .select('interest_id')
        .eq('group_id', groupId);

      // Fetch category details for interests
      const interests: Interest[] = [];
      if (interestsData && interestsData.length > 0) {
        for (const item of interestsData) {
          const { data: category } = await supabase
            .from('categories')
            .select('id, name, name_ar')
            .eq('id', item.interest_id)
            .single();
          
          if (category) {
            interests.push(category);
          }
        }
      }

      setGroup({ ...groupData, interests });

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

  const handleMembershipChange = () => {
    loadGroupData();
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

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لم يتم العثور على المجموعة' : 'Group not found'}
            </p>
            <Button onClick={() => navigate('/groups')}>
              {isRTL ? 'العودة للمجموعات' : 'Back to Groups'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/groups')}
          className="mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'العودة للمجموعات' : 'Back to Groups'}
        </Button>

        <div className="space-y-6">
          {/* Unified Header Block - Header, Leaderboard, and Members merged */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <GroupDetailsHeader
              groupId={group.id}
              groupName={group.group_name}
              imageUrl={group.image_url}
              interests={group.interests}
              totalMembers={group.current_members}
              isMember={!!currentMember}
              memberRole={currentMember?.role}
              visibility={group.visibility}
              requiresApproval={group.requires_approval}
              onMembershipChange={handleMembershipChange}
              onLeaveGroup={handleLeaveGroup}
            />
          </div>

          {/* Only show group content to members */}
          {currentMember && (
            <>
              {/* Events Preview */}
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <GroupEventsPreview groupId={group.id} />
              </div>

              {/* Posts Feed */}
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-muted/20">
                  <h2 className="text-2xl font-bold">
                    {isRTL ? 'المنشورات' : 'Posts'}
                  </h2>
                </div>
                <div className="p-6">
                  <GroupPostsFeed groupId={group.id} userRole={currentMember?.role} />
                </div>
              </div>
            </>
          )}

          {/* Non-members message */}
          {!currentMember && (
            <div className="bg-card rounded-lg border shadow-sm p-12 text-center">
              <p className="text-muted-foreground text-lg">
                {isRTL
                  ? 'انضم إلى المجموعة لرؤية المحتوى والمشاركة'
                  : 'Join the group to see content and participate'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GroupDetails;
