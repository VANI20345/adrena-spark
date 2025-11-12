import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Users, Settings, UserPlus, Crown, MapPin, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GroupSettingsDialog } from './GroupSettingsDialog';

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
  onLeaveGroup
}) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [groupCity, setGroupCity] = useState<{ name: string; name_ar: string } | null>(null);

  const canManageGroup = memberRole === 'owner' || memberRole === 'admin';

  const defaultThumbnail = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=400&fit=crop';

  useEffect(() => {
    loadLeaderboard();
    loadMembers();
    loadGroupCity();
  }, [groupId]);

  const loadGroupCity = async () => {
    const { data } = await supabase
      .from('event_groups')
      .select('cities(name, name_ar)')
      .eq('id', groupId)
      .single();
    
    if (data?.cities) {
      setGroupCity(data.cities);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setIsLoadingLeaders(true);

      const { data: posts, error } = await supabase
        .from('group_posts')
        .select('user_id')
        .eq('group_id', groupId);

      if (error) throw error;

      const postCounts = (posts || []).reduce((acc: any, post) => {
        acc[post.user_id] = (acc[post.user_id] || 0) + 1;
        return acc;
      }, {});

      const topUsers = Object.entries(postCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .map(([userId, count]: any) => ({ user_id: userId, posts_count: count }));

      const leaderboardData = await Promise.all(
        topUsers.map(async (user, index) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', user.user_id)
            .maybeSingle();

          return {
            ...user,
            full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
            avatar_url: profile?.avatar_url || '',
            rank: index + 1
          };
        })
      );

      setLeaders(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoadingLeaders(false);
    }
  };

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);

      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id')
        .eq('group_id', groupId)
        .limit(10);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
            avatar_url: profile?.avatar_url || ''
          };
        })
      );

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const getRankCircle = (rank: number) => {
    const colors = {
      1: 'from-yellow-400 via-yellow-500 to-yellow-600',
      2: 'from-gray-300 via-gray-400 to-gray-500',
      3: 'from-amber-500 via-amber-600 to-amber-700'
    };
    return colors[rank as keyof typeof colors] || 'from-muted via-muted-foreground to-muted';
  };

  const handleJoinGroup = async () => {
    if (!user) return;

    try {
      setIsJoining(true);

      if (requiresApproval) {
        // Create join request
        const { error } = await supabase
          .from('group_join_requests')
          .insert({
            group_id: groupId,
            user_id: user.id
          });

        if (error) throw error;

        toast({
          title: isRTL ? 'تم الإرسال' : 'Request Sent',
          description: isRTL
            ? 'تم إرسال طلب الانضمام للمسؤولين'
            : 'Join request sent to admins'
        });
      } else {
        // Direct join
        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;

        toast({
          title: isRTL ? 'تم الانضمام' : 'Joined',
          description: isRTL ? 'تم الانضمام للمجموعة بنجاح' : 'Successfully joined the group'
        });

        onMembershipChange?.();
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
                disabled={isJoining}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isJoining
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
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
          </div>
          
          {interests && interests.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge key={interest.id} variant="secondary">
                    {isRTL ? interest.name_ar : interest.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Section - Top 3 */}
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
                  <div
                    key={leader.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                      {leader.rank}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={leader.avatar_url} />
                      <AvatarFallback>{leader.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{leader.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {leader.posts_count} {isRTL ? 'منشور' : 'posts'}
                      </div>
                    </div>
                    {leader.rank <= 3 && (
                      <Badge variant={leader.rank === 1 ? 'default' : 'secondary'} className="text-xs">
                        {isRTL ? `المركز ${leader.rank}` : `#${leader.rank}`}
                      </Badge>
                    )}
                  </div>
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
                <Avatar
                  key={member.id}
                  className="h-10 w-10 border-2 border-background hover:z-10 transition-all hover:scale-110"
                  title={member.full_name}
                >
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {member.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
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
    </>
  );
};
