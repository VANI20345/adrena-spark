import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Users, Settings, UserPlus, Crown, MapPin, Tag, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { AdmissionFormDialog } from './AdmissionFormDialog';
import { useGroupLeaderboard, useGroupMembers, useGroupDetails, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';

interface Interest {
  id: string;
  name: string;
  name_ar: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  posts_count: number;
  rank: number;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  role?: string;
}

interface GroupDetailsHeaderProps {
  groupId: string;
  groupName: string;
  imageUrl?: string;
  interests?: Interest[];
  totalMembers: number;
  isMember?: boolean;
  memberRole?: string;
  visibility?: string;
  requiresApproval?: boolean;
  onMembershipChange?: () => void;
  onLeaveGroup?: () => void;
  pendingRequestsCount?: number;
  onShowJoinRequests?: () => void;
}

export const GroupDetailsHeader: React.FC<GroupDetailsHeaderProps> = ({
  groupId,
  groupName,
  imageUrl,
  interests,
  totalMembers,
  isMember = false,
  memberRole,
  visibility = 'public',
  requiresApproval = false,
  onMembershipChange,
  onLeaveGroup,
  pendingRequestsCount = 0,
  onShowJoinRequests
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const [showSettings, setShowSettings] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [showAdmissionDialog, setShowAdmissionDialog] = useState(false);
  const invalidate = useInvalidateGroupQueries();

  const canManageGroup = memberRole === 'owner' || memberRole === 'admin';

  const defaultThumbnail = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=400&fit=crop';

  // Use TanStack Query hooks
  const { data: leaders = [], isLoading: isLoadingLeaders } = useGroupLeaderboard(groupId);
  const { data: members = [], isLoading: isLoadingMembers } = useGroupMembers(groupId);
  const { data: groupDetails } = useGroupDetails(groupId);

  const groupCity = groupDetails?.cities || null;
  const equipment = groupDetails?.equipment || [];
  
  // Parse admission questions from groupDetails
  const admissionQuestions: string[] = useMemo(() => {
    if (!groupDetails?.admission_questions) return [];
    if (Array.isArray(groupDetails.admission_questions)) {
      return groupDetails.admission_questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
    }
    return [];
  }, [groupDetails?.admission_questions]);

  useEffect(() => {
    if (user && requiresApproval && !isMember) {
      checkPendingRequest();
    }
  }, [groupId, user, requiresApproval, isMember]);

  const checkPendingRequest = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('group_join_requests')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setHasPendingRequest(!!data);
  };

  // Sort members to show owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return (roleOrder[a.role as keyof typeof roleOrder] || 2) - (roleOrder[b.role as keyof typeof roleOrder] || 2);
  });

  const getRankCircle = (rank: number) => {
    const colors = {
      1: 'from-yellow-400 via-yellow-500 to-yellow-600',
      2: 'from-gray-300 via-gray-400 to-gray-500',
      3: 'from-amber-500 via-amber-600 to-amber-700'
    };
    return colors[rank as keyof typeof colors] || 'from-muted via-muted-foreground to-muted';
  };

  const handleJoinGroup = async () => {
    if (!user) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يجب تسجيل الدخول أولاً' : 'Please login first',
        variant: 'destructive'
      });
      return;
    }

    // If group requires approval and has admission questions, show the form dialog
    if (requiresApproval && admissionQuestions.length > 0) {
      setShowAdmissionDialog(true);
      return;
    }

    try {
      setIsJoining(true);

      if (requiresApproval) {
        // Check for existing request
        const { data: existingRequest, error: checkError } = await supabase
          .from('group_join_requests')
          .select('id, status')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existingRequest && existingRequest.status === 'pending') {
          toast({
            title: isRTL ? 'تنبيه' : 'Notice',
            description: isRTL ? 'لديك طلب انضمام قيد المراجعة' : 'You already have a pending request',
            variant: 'default'
          });
          setHasPendingRequest(true);
          return;
        }

        if (existingRequest) {
          // Reactivate rejected/approved request
          const { error: updateError } = await supabase
            .from('group_join_requests')
            .update({ 
              status: 'pending', 
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString() 
            })
            .eq('id', existingRequest.id);

          if (updateError) {
            console.error('Error updating request:', updateError);
            throw updateError;
          }
        } else {
          // Create new join request
          const { error: insertError } = await supabase
            .from('group_join_requests')
            .insert({
              group_id: groupId,
              user_id: user.id,
              status: 'pending'
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
        }

        toast({
          title: isRTL ? 'تم الإرسال' : 'Request Sent',
          description: isRTL
            ? 'تم إرسال طلب الانضمام للمسؤولين'
            : 'Join request sent to admins'
        });

        setHasPendingRequest(true);
      } else {
        // Direct join - no approval needed
        const { error: joinError } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member'
          });

        if (joinError) {
          throw joinError;
        }

        toast({
          title: isRTL ? 'تم الانضمام' : 'Joined',
          description: isRTL ? 'تم الانضمام للمجموعة بنجاح' : 'Successfully joined the group'
        });

        // Trigger callback to refresh membership status
        onMembershipChange?.();
      }
    } catch (error: any) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: error?.message || (isRTL ? 'فشل الانضمام للمجموعة' : 'Failed to join group'),
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleAdmissionSuccess = () => {
    setHasPendingRequest(true);
    invalidate.invalidatePendingRequests(groupId);
  };

  const remainingCount = Math.max(0, totalMembers - 10);

  return (
    <>
      <GroupSettingsDialog
        groupId={groupId}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        visibility={visibility}
        requiresApproval={requiresApproval}
        onSettingsSaved={onMembershipChange}
      />
      {/* Group Thumbnail */}
      <div className="h-48 md:h-64 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        <img
          src={imageUrl || defaultThumbnail}
          alt={groupName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Group Info Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-3xl font-bold flex-1">{groupName}</h1>
          
          <div className="flex gap-2">
            {!isMember && (
              <Button
                onClick={handleJoinGroup}
                disabled={isJoining || hasPendingRequest}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {hasPendingRequest
                  ? (isRTL ? 'تم الإرسال!' : 'Request Sent!')
                  : isJoining
                  ? (isRTL ? 'جاري الانضمام...' : 'Joining...')
                  : requiresApproval
                  ? (isRTL ? 'طلب الانضمام' : 'Request to Join')
                  : (isRTL ? 'انضم الآن' : 'Join Group')}
              </Button>
            )}
            
            {isMember && !canManageGroup && onLeaveGroup && (
              <Button
                variant="destructive"
                onClick={onLeaveGroup}
                className="gap-2"
              >
                {isRTL ? 'مغادرة المجموعة' : 'Leave Group'}
              </Button>
            )}
            
            {canManageGroup && (
              <>
                <Button
                  variant="outline"
                  onClick={onShowJoinRequests}
                  className="relative gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {isRTL ? 'طلبات الانضمام' : 'Join Requests'}
                  {pendingRequestsCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center">
                      {pendingRequestsCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>
                {isRTL ? 'السعودية' : 'Saudi Arabia'}
                {groupCity && `, ${isRTL ? groupCity.name_ar : groupCity.name}`}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {visibility === 'public'
                ? (isRTL ? 'عامة' : 'Public')
                : (isRTL ? 'خاصة' : 'Private')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {totalMembers} {isRTL ? 'عضو' : 'Members'}
            </Badge>
          </div>
          
          {interests && interests.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'اهتمامات المجموعة' : 'Group Interests'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge key={interest.id} variant="secondary">
                      {isRTL ? interest.name_ar : interest.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {equipment && equipment.length > 0 && (
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'المعدات المطلوبة' : 'Required Gears'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {equipment.map((item, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Section - Top 3 - Only visible to members */}
      {isMember && (
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {isRTL ? 'لوحة المتصدرين' : 'Top Leaders'}
            </h2>
            {leaders.length > 3 && (
              <Button variant="outline" size="sm" onClick={() => setShowFullLeaderboard(true)}>
                {isRTL ? 'عرض الكل' : 'View All'}
              </Button>
            )}
          </div>

        {isLoadingLeaders ? (
          <div className="text-center py-6 text-muted-foreground">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {isRTL ? 'لا يوجد نشاط بعد' : 'No activity yet'}
          </div>
        ) : (
          <div className="flex items-end justify-center gap-6 py-4">
            {/* Second Place */}
            {leaders[1] && (
              <div className="flex flex-col items-center space-y-3 pb-4">
                <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getRankCircle(2)} p-1 shadow-lg`}>
                  <div className="w-full h-full rounded-full bg-background p-1">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={leaders[1].avatar_url} />
                      <AvatarFallback>{leaders[1].full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-gray-300 to-gray-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md">
                    2
                  </div>
                </div>
                <div className="text-center max-w-[120px]">
                  <div className="font-semibold text-sm break-words">{leaders[1].full_name}</div>
                  <div className="text-xs text-muted-foreground">{leaders[1].posts_count} {isRTL ? 'منشور' : 'posts'}</div>
                </div>
              </div>
            )}

            {/* First Place */}
            {leaders[0] && (
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <Crown className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-10 h-10 text-yellow-500 animate-pulse" />
                  <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${getRankCircle(1)} p-1 shadow-2xl`}>
                    <div className="w-full h-full rounded-full bg-background p-1">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={leaders[0].avatar_url} />
                        <AvatarFallback>{leaders[0].full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white rounded-full w-9 h-9 flex items-center justify-center text-base font-bold shadow-lg">
                      1
                    </div>
                  </div>
                </div>
                <div className="text-center max-w-[140px]">
                  <div className="font-bold text-base break-words">{leaders[0].full_name}</div>
                  <div className="text-sm text-muted-foreground">{leaders[0].posts_count} {isRTL ? 'منشور' : 'posts'}</div>
                </div>
              </div>
            )}

            {/* Third Place */}
            {leaders[2] && (
              <div className="flex flex-col items-center space-y-3 pb-4">
                <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getRankCircle(3)} p-1 shadow-lg`}>
                  <div className="w-full h-full rounded-full bg-background p-1">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={leaders[2].avatar_url} />
                      <AvatarFallback>{leaders[2].full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md">
                    3
                  </div>
                </div>
                <div className="text-center max-w-[120px]">
                  <div className="font-semibold text-sm break-words">{leaders[2].full_name}</div>
                  <div className="text-xs text-muted-foreground">{leaders[2].posts_count} {isRTL ? 'منشور' : 'posts'}</div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}

      {/* Full Leaderboard Dialog */}
      <Dialog open={showFullLeaderboard} onOpenChange={setShowFullLeaderboard}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {isRTL ? 'لوحة المتصدرين' : 'Full Leaderboard'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="weekly">{isRTL ? 'أسبوعي' : 'Weekly'}</TabsTrigger>
              <TabsTrigger value="monthly">{isRTL ? 'شهري' : 'Monthly'}</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {leaders.map((leader) => (
                  <Link
                    key={leader.user_id}
                    to={`/user/${leader.user_id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                      {leader.rank}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={leader.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">{leader.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate hover:underline">{leader.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {leader.posts_count} {isRTL ? 'منشور' : 'posts'}
                      </div>
                    </div>
                    {leader.rank <= 3 && (
                      <Badge variant={leader.rank === 1 ? 'default' : 'secondary'} className="text-xs">
                        {isRTL ? `المركز ${leader.rank}` : `#${leader.rank}`}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="monthly">
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? 'قريباً' : 'Coming soon'}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Members Section */}
      <div className="px-6 pb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          {isRTL ? 'الأعضاء' : 'Members'}
          <span className="text-sm font-normal text-muted-foreground">
            ({totalMembers})
          </span>
        </h2>

        {isLoadingMembers ? (
          <div className="text-center py-6 text-muted-foreground">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex -space-x-2">
              {members.map((member) => (
                <Link 
                  key={member.id} 
                  to={`/user/${member.user_id}`}
                  className="relative group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar
                    className="h-10 w-10 border-2 border-background hover:z-10 transition-all hover:scale-110 cursor-pointer"
                    title={member.full_name}
                  >
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {member.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Role indicator */}
                  {member.role === 'owner' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {member.role === 'admin' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
            {remainingCount > 0 && (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                +{remainingCount}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admission Form Dialog for groups with screening questions */}
      <AdmissionFormDialog
        open={showAdmissionDialog}
        onClose={() => setShowAdmissionDialog(false)}
        groupId={groupId}
        groupName={groupName}
        questions={admissionQuestions}
        onSuccess={handleAdmissionSuccess}
      />
    </>
  );
};
