import React, { useState, useEffect } from 'react';
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
import { CreateTicketDialog } from '@/components/Tickets/CreateTicketDialog';
import Navbar from '@/components/Layout/Navbar';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useGroupDetails, useGroupMembers, usePendingJoinRequests, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { language, t } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showJoinRequestsDialog, setShowJoinRequestsDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const isRTL = language === 'ar';
  const invalidate = useInvalidateGroupQueries();

  // Use TanStack Query hooks
  const { data: group, isLoading: isLoadingGroup } = useGroupDetails(groupId);
  const { data: members = [], isLoading: isLoadingMembers } = useGroupMembers(groupId);
  
  // Check if current user is a web admin
  const [isWebAdmin, setIsWebAdmin] = useState(false);
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsWebAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsWebAdmin(!!data);
    };
    checkAdminStatus();
  }, [user]);
  
  // Find current user's membership or grant access to admins
  const currentMember = user ? members.find(m => m.user_id === user.id) : null;
  const hasAccess = !!currentMember || isWebAdmin;
  const canManageGroup = currentMember?.role === 'owner' || currentMember?.role === 'admin' || isWebAdmin;
  
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
        title: t('success'),
        description: t('groups.leftSuccess')
      });

      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: t('error'),
        description: t('groups.leaveError'),
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

  // Get group owner/admin info for ticket
  const groupOwner = members.find(m => m.role === 'owner');
  const groupAdmins = members.filter(m => m.role === 'admin' || m.role === 'owner');

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'العودة للمجموعات' : 'Back to Groups'}
          </Button>
        </div>

        {/* Group Title with Ask Leader Button - Only for members */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{group?.group_name}</h1>
          
          {/* Ask Leader button - only visible for group members */}
          {hasAccess && user && !canManageGroup && (
            <Button 
              variant="default"
              onClick={() => setShowTicketDialog(true)}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {isRTL ? 'اسأل القائد' : 'Ask the Leader'}
            </Button>
          )}
        </div>
        
        {/* Ticket Dialog */}
        <CreateTicketDialog
          open={showTicketDialog}
          onClose={() => setShowTicketDialog(false)}
          ticketType="group_inquiry"
          entityId={groupId}
          entityType="group"
          targetUserId={groupOwner?.user_id || group?.created_by}
          targetUserName={groupOwner?.profiles?.full_name}
          entityName={group?.group_name}
        />

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

          {/* Non-Member View - Show to non-members who are not admins */}
          {!hasAccess && (
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

          {/* Show group content to members OR web admins */}
          {hasAccess && (
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
                  <GroupPostsFeed groupId={group.id} userRole={isWebAdmin ? 'admin' : currentMember?.role} />
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
