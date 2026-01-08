import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInvalidateGroupQueries } from '@/hooks/useGroupQueries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AdmissionFormDialog } from './AdmissionFormDialog';
import { 
  MapPin, 
  Users, 
  Lock, 
  Shield, 
  Crown, 
  UserPlus, 
  Wrench, 
  Tag 
} from 'lucide-react';

interface GroupCity {
  name: string;
  name_ar: string;
}

interface GroupInterest {
  id: string;
  name: string;
  name_ar: string;
}

interface GroupMember {
  id: string;
  role: string;
  user_id: string;
  avatar_url?: string;
  full_name?: string;
  profiles?: {
    avatar_url?: string;
    full_name?: string;
  };
}

interface GroupInfo {
  id: string;
  group_name: string;
  description?: string | null;
  description_ar?: string | null;
  current_members: number;
  max_members: number;
  visibility?: string;
  requires_approval?: boolean;
  equipment?: string[] | null;
  city?: GroupCity | null;
  interests?: GroupInterest[];
  min_age?: number | null;
  max_age?: number | null;
  gender_restriction?: string | null;
  location_restriction?: string | null;
  location_city?: GroupCity | null;
  admission_questions?: unknown;
}

interface NonMemberGroupViewProps {
  group: GroupInfo;
  members: GroupMember[];
  isRTL: boolean;
  onMembershipChange: () => void;
}

export const NonMemberGroupView: React.FC<NonMemberGroupViewProps> = ({
  group,
  members,
  isRTL,
  onMembershipChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [showAdmissionDialog, setShowAdmissionDialog] = useState(false);
  const invalidate = useInvalidateGroupQueries();
  
  const owner = members.find(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const previewMembers = members.slice(0, 8);
  
  // Parse admission questions from group
  const admissionQuestions: string[] = React.useMemo(() => {
    if (!group.admission_questions) return [];
    if (Array.isArray(group.admission_questions)) {
      return group.admission_questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
    }
    return [];
  }, [group.admission_questions]);

  useEffect(() => {
    if (user && group.requires_approval) {
      checkPendingRequest();
    }
  }, [user, group.id, group.requires_approval]);

  const checkPendingRequest = async () => {
    if (!user) return;
    
    // Only check for truly pending requests - rejected/approved requests should allow re-application
    const { data } = await supabase
      .from('group_join_requests')
      .select('id, status')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    // Only block if there's an actual pending request
    setHasPendingRequest(!!data);
  };
  
  const handleJoinGroup = async () => {
    // Redirect anonymous users to login
    if (!user) {
      navigate('/auth');
      return;
    }

    if (hasPendingRequest) {
      toast({
        title: isRTL ? 'تنبيه' : 'Notice',
        description: isRTL ? 'لديك طلب انضمام قيد المراجعة' : 'You already have a pending join request',
        variant: 'default'
      });
      return;
    }

    // If group requires approval and has admission questions, show the form dialog
    if (group.requires_approval && admissionQuestions.length > 0) {
      setShowAdmissionDialog(true);
      return;
    }

    try {
      setIsJoining(true);

      if (group.requires_approval) {
        // Check for existing request (any status - pending, approved, rejected)
        const { data: existingRequest } = await supabase
          .from('group_join_requests')
          .select('id, status')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRequest) {
          // Reactivate/reset the existing request for re-application
          const { error } = await supabase
            .from('group_join_requests')
            .update({ 
              status: 'pending', 
              reviewed_at: null, 
              reviewed_by: null,
              admission_answers: null,
              message: null,
              created_at: new Date().toISOString() 
            })
            .eq('id', existingRequest.id);

          if (error) throw error;
        } else {
          // Create new request without admission answers
          const { error } = await supabase
            .from('group_join_requests')
            .insert({
              group_id: group.id,
              user_id: user.id,
              status: 'pending'
            });

          if (error) throw error;
        }

        setHasPendingRequest(true);

        toast({
          title: isRTL ? 'تم الإرسال' : 'Request Sent',
          description: isRTL ? 'تم إرسال طلب الانضمام للمسؤولين' : 'Join request sent to admins'
        });
      } else {
        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        toast({
          title: isRTL ? 'تم الانضمام' : 'Joined',
          description: isRTL ? 'تم الانضمام للمجموعة بنجاح' : 'Successfully joined the group'
        });

        // Invalidate queries
        invalidate.invalidateGroupDetails(group.id);
        invalidate.invalidateGroupMembers(group.id);
        invalidate.invalidateMyGroups();
        
        onMembershipChange();
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل الانضمام للمجموعة' : 'Failed to join group',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleAdmissionSuccess = () => {
    setHasPendingRequest(true);
    invalidate.invalidatePendingRequests(group.id);
  };

  // Helper to get member display data
  const getMemberData = (member: GroupMember) => {
    return {
      avatar_url: member.profiles?.avatar_url || member.avatar_url,
      full_name: member.profiles?.full_name || member.full_name || (isRTL ? 'مستخدم' : 'User')
    };
  };

  return (
    <div className="space-y-6">
      {/* Group Description */}
      {(group.description || group.description_ar) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isRTL ? 'نبذة عن المجموعة' : 'About the Group'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
              {isRTL ? group.description_ar || group.description : group.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Group Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Location & Members Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {isRTL ? 'معلومات المجموعة' : 'Group Info'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {isRTL ? 'السعودية' : 'Saudi Arabia'}
                {group.city && `, ${isRTL ? group.city.name_ar : group.city.name}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>
                {group.current_members} / {group.max_members} {isRTL ? 'عضو' : 'members'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {group.visibility === 'private' ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Users className="w-4 h-4 text-muted-foreground" />
              )}
              <Badge variant="outline">
                {group.visibility === 'public' 
                  ? (isRTL ? 'مجموعة عامة' : 'Public Group')
                  : (isRTL ? 'مجموعة خاصة' : 'Private Group')}
              </Badge>
            </div>
            {group.requires_approval && (
              <div className="flex items-center gap-3 text-amber-600">
                <Shield className="w-4 h-4" />
                <span className="text-sm">
                  {isRTL ? 'تحتاج موافقة للانضمام' : 'Requires approval to join'}
                </span>
              </div>
            )}

            {/* Group Restrictions */}
            {((group.min_age && group.min_age > 0) || (group.max_age && group.max_age < 100) || group.gender_restriction || group.location_restriction) && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {isRTL ? 'متطلبات الانضمام' : 'Join Requirements'}
                  </span>
                </div>
                <div className="space-y-2">
                  {((group.min_age && group.min_age > 0) || (group.max_age && group.max_age < 100)) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-normal">
                        {isRTL ? 'العمر: ' : 'Age: '}
                        {group.min_age || 18} - {group.max_age || 65} {isRTL ? 'سنة' : 'years'}
                      </Badge>
                    </div>
                  )}
                  {group.gender_restriction && group.gender_restriction !== 'both' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-normal">
                        {isRTL ? 'الجنس: ' : 'Gender: '}
                        {group.gender_restriction === 'male' 
                          ? (isRTL ? 'ذكور فقط' : 'Male only')
                          : (isRTL ? 'إناث فقط' : 'Female only')}
                      </Badge>
                    </div>
                  )}
                  {group.location_restriction && group.location_city && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-normal">
                        {isRTL ? 'المقيمون في: ' : 'Residents of: '}
                        {isRTL ? group.location_city.name_ar : group.location_city.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {group.equipment && group.equipment.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wrench className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {isRTL ? 'المعدات المطلوبة' : 'Required Equipment'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.equipment.map((item, index) => (
                    <Badge key={index} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {group.interests && group.interests.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {isRTL ? 'الاهتمامات' : 'Interests'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.interests.map((interest) => (
                    <Badge key={interest.id} variant="secondary">
                      {isRTL ? interest.name_ar : interest.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner & Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              {isRTL ? 'مسؤولو المجموعة' : 'Group Managers'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner */}
            {owner && (
              <div 
                className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                onClick={() => navigate(`/user/${owner.user_id}`)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getMemberData(owner).avatar_url} />
                  <AvatarFallback>{getMemberData(owner).full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {getMemberData(owner).full_name}
                    <Crown className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isRTL ? 'مالك المجموعة' : 'Group Owner'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Admins */}
            {admins.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'المشرفون' : 'Admins'}
                </p>
                {admins.map(admin => (
                  <div 
                    key={admin.id} 
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/user/${admin.user_id}`)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getMemberData(admin).avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getMemberData(admin).full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {getMemberData(admin).full_name}
                        <Shield className="w-3 h-3 text-blue-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {isRTL ? 'أعضاء المجموعة' : 'Group Members'}
            <Badge variant="secondary" className={isRTL ? 'ml-2' : 'mr-2'}>{group.current_members}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {previewMembers.map(member => (
              <div 
                key={member.id} 
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate(`/user/${member.user_id}`)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getMemberData(member).avatar_url} />
                  <AvatarFallback>{getMemberData(member).full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{getMemberData(member).full_name}</span>
                {member.role === 'owner' && <Crown className="w-3 h-3 text-yellow-500" />}
                {member.role === 'admin' && <Shield className="w-3 h-3 text-blue-500" />}
              </div>
            ))}
            {members.length > 8 && (
              <div className="flex items-center justify-center p-2 bg-muted rounded-lg min-w-[80px]">
                <span className="text-sm text-muted-foreground">
                  +{members.length - 8} {isRTL ? 'آخرين' : 'more'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Join Button */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold">
              {isRTL ? 'انضم إلى هذه المجموعة' : 'Join this Group'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL 
                ? 'انضم للمجموعة للوصول إلى المحتوى والفعاليات والمشاركة مع الأعضاء'
                : 'Join the group to access content, events, and participate with members'}
            </p>
            <Button
              size="lg"
              onClick={handleJoinGroup}
              disabled={isJoining || hasPendingRequest}
              className="gap-2 min-w-[200px]"
            >
              <UserPlus className="w-5 h-5" />
              {hasPendingRequest
                ? (isRTL ? 'تم الإرسال!' : 'Request Sent!')
                : isJoining
                ? (isRTL ? 'جاري الانضمام...' : 'Joining...')
                : group.requires_approval
                ? (isRTL ? 'طلب الانضمام' : 'Request to Join')
                : (isRTL ? 'انضم الآن' : 'Join Now')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admission Form Dialog for groups with screening questions */}
      <AdmissionFormDialog
        open={showAdmissionDialog}
        onClose={() => setShowAdmissionDialog(false)}
        groupId={group.id}
        groupName={group.group_name}
        questions={admissionQuestions}
        onSuccess={handleAdmissionSuccess}
      />
    </div>
  );
};
