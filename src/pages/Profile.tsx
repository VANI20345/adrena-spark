import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Edit2, 
  Award,
  CalendarCheck,
  ChevronRight,
  Trophy,
  Lock,
  Heart,
  BookOpen,
  Trash2,
  LogOut,
  MapPin,
  UserCircle,
  Users,
  Gift,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';
import { useQuery } from '@tanstack/react-query';
import { useUserBadges, useUserReferralInfo } from '@/hooks/useGamification';
import { ShieldBadge } from '@/components/Gamification/BadgeDisplay';
import { AchievementsSection } from '@/components/Gamification/AchievementsSection';
import { ReferralCard } from '@/components/Referral/ReferralCard';
import { ChangePasswordDialog } from '@/components/Profile/ChangePasswordDialog';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface UserStats {
  points: number;
  eventsAttended: number;
  groupsCount: number;
}

interface Training {
  id: string;
  title: string;
  title_ar: string;
  location: string;
  location_ar: string;
  status: string;
  current_attendees: number;
  max_attendees: number | null;
  start_date: string;
  end_date: string;
}

interface Group {
  id: string;
  group_name: string;
  image_url: string | null;
}

interface Follower {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_id: string;
}

const Profile = () => {
  const { user, profile, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const isProvider = userRole === 'provider';
  
  // Gamification hooks
  const { data: userBadges } = useUserBadges(user?.id);
  const { data: referralInfo } = useUserReferralInfo();

  // Fetch profile points
  const { data: profileData } = useQuery({
    queryKey: ['profile-points', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch bookings count
  const { data: bookingsData = [] } = useQuery({
    queryKey: ['user-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch groups count
  const { data: groupsCountData = [] } = useQuery({
    queryKey: ['user-groups-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch trainings
  const { data: trainings = [] } = useQuery({
    queryKey: ['user-trainings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: bookingsWithEvents } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          events:event_id (
            id,
            title,
            title_ar,
            location,
            location_ar,
            status,
            current_attendees,
            max_attendees,
            start_date,
            end_date
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(3);

      if (bookingsWithEvents) {
        return bookingsWithEvents
          .filter(b => b.events)
          .map(b => b.events as unknown as Training);
      }
      return [];
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000,
  });

  // Fetch followers
  const { data: followersData } = useQuery({
    queryKey: ['user-followers', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: [], count: 0 };
      
      const [followersResult, profileCounts] = await Promise.all([
        supabase
          .from('user_follows')
          .select(`
            id,
            follower_id,
            profiles:follower_id (
              user_id,
              full_name,
              avatar_url,
              display_id
            )
          `)
          .eq('following_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('profiles')
          .select('followers_count')
          .eq('user_id', user.id)
          .single()
      ]);

      const mappedFollowers = followersResult.data
        ?.filter(f => f.profiles)
        .map(f => {
          const profile = f.profiles as any;
          return {
            id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            display_id: profile.display_id
          };
        }) || [];

      return {
        followers: mappedFollowers,
        count: profileCounts.data?.followers_count || 0
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user groups
  const { data: groups = [] } = useQuery({
    queryKey: ['user-created-groups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: groupsData } = await supabase
        .from('event_groups')
        .select('id, group_name, image_url')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      return groupsData || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const stats = {
    points: profileData?.points_balance || 0,
    eventsAttended: bookingsData.length,
    groupsCount: groupsCountData.length
  };

  const followers = followersData?.followers || [];
  const followersCount = followersData?.count || 0;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user!.id);

      toast.success('تم تحديث الصورة الشخصية بنجاح');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getProgressPercentage = (current: number, max: number | null) => {
    if (!max || max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Curved Green Header Background */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-primary to-primary-glow">
          <svg
            className="absolute bottom-0 w-full h-16 text-background"
            preserveAspectRatio="none"
            viewBox="0 0 1440 54"
            fill="currentColor"
          >
            <path d="M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z" />
          </svg>
        </div>

        {/* Profile Content */}
        <div className="relative container max-w-4xl mx-auto px-4 pt-16">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <label className="absolute bottom-0 right-0 cursor-pointer group">
                <div className="bg-primary text-primary-foreground rounded-full p-3 hover:bg-primary-glow transition-all shadow-lg group-hover:scale-110">
                  <Edit2 className="h-5 w-5" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* User Name */}
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              {profile?.full_name || 'اسم المستخدم'}
            </h1>

            {/* Badge & Shield */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {referralInfo?.is_shield_member && <ShieldBadge size="md" />}
              <Trophy className="h-5 w-5 text-yellow-500" />
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
                عضو نشط
              </Badge>
            </div>

            {/* Stats Section */}
            <div className={`grid ${isProvider ? 'grid-cols-2' : 'grid-cols-3'} gap-8 w-full max-w-md`}>
              {!isProvider && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">{stats.points}</div>
                  <div className="text-sm text-muted-foreground mt-1">النقاط</div>
                </div>
              )}
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary">{stats.groupsCount}</div>
                <div className="text-sm text-muted-foreground mt-1">المجموعات</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary">{stats.eventsAttended}</div>
                <div className="text-sm text-muted-foreground mt-1">الفعاليات</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Achievements & Badges Section - Always visible */}
        <AchievementsSection
          userBadges={userBadges || []}
          isShieldMember={referralInfo?.is_shield_member}
          totalPoints={stats.points}
        />

        {/* Followers Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">المتابعون</h2>
              {followersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/followers')}>
                  عرض الكل ({followersCount})
                  <ChevronRight className="h-4 w-4 mr-1" />
                </Button>
              )}
            </div>
            
            {followers.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {followers.map((follower) => (
                  <div 
                    key={follower.id} 
                    className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                    onClick={() => navigate(`/user/${follower.id}`)}
                  >
                    <Avatar className="h-16 w-16 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                      <AvatarImage src={follower.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {follower.full_name?.charAt(0) || follower.display_id.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center truncate w-full font-medium">
                      {follower.full_name || follower.display_id}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">لا يوجد متابعون بعد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainings/Events Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">تدريباتي</h2>
              {trainings.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                  عرض الكل
                  <ChevronRight className="h-4 w-4 mr-1" />
                </Button>
              )}
            </div>
            
            {trainings.length > 0 ? (
              <div className="space-y-3">
                {trainings.map((training) => {
                  const progress = getProgressPercentage(training.current_attendees, training.max_attendees);
                  const now = new Date();
                  const startDate = new Date(training.start_date);
                  const endDate = new Date(training.end_date);
                  const isUpcoming = startDate > now;
                  const isOngoing = startDate <= now && endDate >= now;
                  
                  return (
                    <Card key={training.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{training.title_ar || training.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{training.location_ar || training.location}</span>
                              <Badge variant="outline" className="text-xs">
                                {isOngoing ? 'جاري' : isUpcoming ? 'قادم' : 'منتهي'}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/events/${training.id}`)}>
                            تفاصيل
                          </Button>
                        </div>
                        {training.max_attendees && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>المشاركون: {training.current_attendees}/{training.max_attendees}</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">لم تقم بحجز أي تدريبات بعد</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate('/events')}
                >
                  استكشف التدريبات
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Groups Section */}
        {groups.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">مجموعاتي</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/organized-groups')}>
                  عرض الكل
                  <ChevronRight className="h-4 w-4 mr-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-primary/5">
                      {group.image_url ? (
                        <img src={group.image_url} alt={group.group_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-center truncate">{group.group_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Section */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <h2 className="text-lg font-bold mb-4">الإعدادات</h2>
            
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-primary/5"
              onClick={() => navigate('/settings')}
            >
              <div className="flex items-center gap-3">
                <UserCircle className="h-5 w-5 text-primary" />
                <span>تعديل البيانات</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-primary/5"
              onClick={() => setShowPasswordDialog(true)}
            >
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <span>تغيير كلمة المرور</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-primary/5"
              onClick={() => navigate('/interests-settings')}
            >
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-primary" />
                <span>الاهتمامات</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-primary/5"
              onClick={() => navigate('/tickets')}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>الحجوزات</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-destructive/5 text-destructive"
              onClick={() => {
                if (confirm('هل أنت متأكد من حذف حسابك؟')) {
                  toast.error('سيتم تفعيل هذه الميزة قريباً');
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5" />
                <span>حذف الحساب</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-destructive/5 text-destructive"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span>تسجيل الخروج</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </div>
  );
};

export default Profile;
