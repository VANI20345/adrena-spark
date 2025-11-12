import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Edit2, 
  Award,
  Users,
  CalendarCheck,
  ChevronRight,
  Trophy,
  Lock,
  Heart,
  BookOpen,
  Trash2,
  LogOut,
  MapPin,
  UserCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';

interface UserStats {
  points: number;
  followers: number;
  eventsAttended: number;
}

interface Follower {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Training {
  id: string;
  title: string;
  city: string;
  status: string;
  current_attendees: number;
  max_attendees: number;
}

interface Group {
  id: string;
  group_name: string;
  image_url: string | null;
}

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<UserStats>({ points: 0, followers: 0, eventsAttended: 0 });
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const [profileData, bookingsData, followersData] = await Promise.all([
        supabase.from('profiles').select('points_balance, followers_count').eq('user_id', user!.id).single(),
        supabase.from('bookings').select('id').eq('user_id', user!.id).eq('status', 'confirmed'),
        supabase.from('profiles').select('user_id, full_name, avatar_url').limit(10)
      ]);

      setStats({
        points: profileData.data?.points_balance || 0,
        followers: profileData.data?.followers_count || 0,
        eventsAttended: bookingsData.data?.length || 0
      });

      if (followersData.data) {
        setFollowers(followersData.data.map(f => ({
          id: f.user_id,
          full_name: f.full_name || 'مستخدم',
          avatar_url: f.avatar_url
        })));
      }

      const { data: trainingsData } = await supabase
        .from('events')
        .select('id, title, location')
        .eq('organizer_id', user!.id)
        .limit(3);

      if (trainingsData) {
        setTrainings(trainingsData.map(t => ({
          id: t.id,
          title: t.title || 'تدريب',
          city: t.location || '',
          status: 'active',
          current_attendees: 0,
          max_attendees: 0
        })));
      }

      const { data: groupsData } = await supabase
        .from('event_groups')
        .select('id, group_name, image_url')
        .eq('created_by', user!.id)
        .limit(3);

      if (groupsData) {
        setGroups(groupsData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background">
      <Navbar />
      
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Header with Avatar and User Info */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow opacity-10" />
          
          <CardContent className="relative pt-8 pb-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <label className="absolute bottom-0 right-0 cursor-pointer group">
                  <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary-glow transition-all shadow-lg group-hover:scale-110">
                    <Edit2 className="h-4 w-4" />
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

              <div>
                <h1 className="text-2xl font-bold mb-2">
                  {profile?.full_name || 'اسم المستخدم'}
                </h1>
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    بطل لوحة الصدارة
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 w-full mt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Award className="h-5 w-5 text-primary ml-1" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{stats.points}</div>
                  <div className="text-xs text-muted-foreground">النقاط</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-5 w-5 text-primary ml-1" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{stats.followers}</div>
                  <div className="text-xs text-muted-foreground">المتابعون</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CalendarCheck className="h-5 w-5 text-primary ml-1" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{stats.eventsAttended}</div>
                  <div className="text-xs text-muted-foreground">الفعاليات</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Followers Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">المتابعون</h2>
              <Button variant="ghost" size="sm">
                عرض الكل
                <ChevronRight className="h-4 w-4 mr-1" />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {followers.slice(0, 10).map((follower) => (
                <div key={follower.id} className="text-center">
                  <Avatar className="h-12 w-12 mx-auto mb-2">
                    <AvatarImage src={follower.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {follower.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs truncate">{follower.full_name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trainings Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">تدريباتي</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/manage-services')}>
                عرض الكل
                <ChevronRight className="h-4 w-4 mr-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {trainings.map((training) => (
                <Card key={training.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold mb-1">{training.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{training.city}</span>
                          <Badge variant="outline" className="text-xs">
                            {training.status === 'active' ? 'نشط' : 'منتهي'}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/service/${training.id}`)}>
                        تفاصيل
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>المشاركون: {training.current_attendees}/{training.max_attendees}</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groups Section */}
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
              onClick={() => navigate('/settings')}
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
              onClick={() => navigate('/settings')}
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
    </div>
  );
};

export default Profile;
