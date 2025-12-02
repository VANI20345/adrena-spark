import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GroupPostsFeed } from '@/components/Groups/GroupPostsFeed';
import { GroupDetailsHeader } from '@/components/Groups/GroupDetailsHeader';
import { GroupEventsPreview } from '@/components/Groups/GroupEventsPreview';
import { JoinRequestsDialog } from '@/components/Groups/JoinRequestsDialog';
import { NonMemberGroupView } from '@/components/Groups/NonMemberGroupView';
import Navbar from '@/components/Layout/Navbar';
import { ArrowLeft } from 'lucide-react';
import { useGroupDetails, useGroupMembers, usePendingJoinRequests, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showJoinRequestsDialog, setShowJoinRequestsDialog] = useState(false);
  const isRTL = language === 'ar';
  const invalidate = useInvalidateGroupQueries();

  // Use TanStack Query hooks
  const { data: group, isLoading: isLoadingGroup } = useGroupDetails(groupId);
  const { data: members = [], isLoading: isLoadingMembers } = useGroupMembers(groupId);
  
  // Find current user's membership
  const currentMember = user ? members.find(m => m.user_id === user.id) : null;
  const canManageGroup = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  
  // Load pending requests count only if user is admin/owner
  const { data: pendingRequestsCount = 0 } = usePendingJoinRequests(groupId, canManageGroup);

  const isLoading = isLoadingGroup || isLoadingMembers;

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

      // Invalidate all related queries BEFORE navigating
      invalidate.invalidateAll(groupId!);
      invalidate.invalidateMyGroups();

      toast({
        title: isRTL ? 'تم بنجاح' : 'Success',
        description: isRTL ? 'تم مغادرة المجموعة' : 'Left the group'
      });

      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء مغادرة المجموعة' : 'Failed to leave group',
        variant: 'destructive'
      });
    }
  };

  const handleMembershipChange = () => {
    // Invalidate relevant queries
    invalidate.invalidateGroupDetails(groupId!);
    invalidate.invalidateGroupMembers(groupId!);
    invalidate.invalidatePendingRequests(groupId!);
    invalidate.invalidateMyGroups(); // Update my groups list
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
          {/* Header */}
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
              pendingRequestsCount={pendingRequestsCount}
              onShowJoinRequests={() => setShowJoinRequestsDialog(true)}
            />
          </div>

          {/* Non-Member View */}
          {!currentMember && (
            <NonMemberGroupView
              group={{
                ...group,
                city: group.cities || group.location_city,
              }}
              members={members}
              isRTL={isRTL}
              onMembershipChange={handleMembershipChange}
            />
          )}

          {/* Only show group content to members */}
          {currentMember && (
            <>
              {/* Join Requests Dialog */}
              <JoinRequestsDialog
                groupId={group.id}
                open={showJoinRequestsDialog}
                onClose={() => setShowJoinRequestsDialog(false)}
                onRequestHandled={handleMembershipChange}
              />

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
        </div>
      </main>
    </div>
  );
};

export default GroupDetails;
