import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Camera, 
  Star,
  Calendar,
  DollarSign,
  Gift,
  TrendingUp,
  Award,
  Settings,
  Edit3,
  Upload,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';

const Profile = () => {
  const { user, profile, userRole, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone: '',
    city: '',
  });
  
  const [stats, setStats] = useState({
    events_attended: 0,
    events_organized: 0,
    services_provided: 0,
    points: 0,
    wallet_balance: 0,
    rating: 0,
    total_earnings: 0
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Initialize form data
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        city: profile.city || '',
      });
    }
  }, [profile]);

  const loadUserStats = useCallback(async () => {
    try {
      // Load events attended/organized
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq(userRole === 'organizer' ? 'organizer_id' : 'id', user?.id);

      // Load services (for providers)
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user?.id);

      // Load real user data from database instead of mock data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('user_id', user?.id)
        .single();

      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('balance, total_earned')
        .eq('user_id', user?.id)
        .single();

      setStats({
        events_attended: userRole === 'attendee' ? 0 : 0, // Will be calculated from bookings
        events_organized: userRole === 'organizer' ? (eventsData?.length || 0) : 0,
        services_provided: userRole === 'provider' ? (servicesData?.length || 0) : 0,
        points: profileData?.points_balance || 0,
        wallet_balance: walletData?.balance || 0,
        rating: 4.8, // Will be calculated from reviews
        total_earnings: walletData?.total_earned || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats on error
      setStats({
        events_attended: 0,
        events_organized: 0,
        services_provided: 0,
        points: 0,
        wallet_balance: 0,
        rating: 0,
        total_earnings: 0
      });
    }
  }, [user?.id, userRole]);

  // Load user statistics
  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user, loadUserStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await updateProfile(formData);
      if (error) {
        toast.error('حدث خطأ في تحديث الملف الشخصي');
      } else {
        toast.success('تم تحديث الملف الشخصي بنجاح');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage (when storage is configured)
      // For now, just show success message
      toast.success('سيتم تفعيل رفع الصور قريباً');
    } catch (error) {
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const getRoleDisplay = () => {
    switch (userRole) {
      case 'attendee':
        return 'باحث عن فعالية';
      case 'organizer':
        return 'منظم فعاليات';
      case 'provider':
        return 'مقدم خدمة';
      default:
        return 'غير محدد';
    }
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'attendee':
        return 'bg-blue-100 text-blue-800';
      case 'organizer':
        return 'bg-green-100 text-green-800';
      case 'provider':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Avatar Section */}
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors">
                      <Camera className="h-4 w-4" />
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

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {profile?.full_name || 'اسم المستخدم'}
                      </h1>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getRoleBadgeColor()}>
                          {getRoleDisplay()}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{stats.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        {profile?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {profile.phone}
                          </div>
                        )}
                        {profile?.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {profile.city}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {isEditing ? 'إلغاء' : 'تعديل'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/settings')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        الإعدادات
                      </Button>
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground mb-4">{profile.bio}</p>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {userRole === 'attendee' && (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.events_attended}</div>
                          <div className="text-sm text-muted-foreground">فعالية حضرتها</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.points}</div>
                          <div className="text-sm text-muted-foreground">نقطة</div>
                        </div>
                      </>
                    )}
                    
                    {userRole === 'organizer' && (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.events_organized}</div>
                          <div className="text-sm text-muted-foreground">فعالية نظمتها</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.wallet_balance} ر.س</div>
                          <div className="text-sm text-muted-foreground">رصيد المحفظة</div>
                        </div>
                      </>
                    )}
                    
                    {userRole === 'provider' && (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.services_provided}</div>
                          <div className="text-sm text-muted-foreground">خدمة قدمتها</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.total_earnings} ر.س</div>
                          <div className="text-sm text-muted-foreground">إجمالي الأرباح</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">المعلومات</TabsTrigger>
              <TabsTrigger value="wallet">المحفظة</TabsTrigger>
              <TabsTrigger value="points">النقاط</TabsTrigger>
              <TabsTrigger value="reviews">التقييمات</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>المعلومات الشخصية</CardTitle>
                  <CardDescription>إدارة معلوماتك الأساسية والملف الشخصي</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">الاسم الكامل</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="أدخل اسمك الكامل"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الجوال</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="05xxxxxxxx"
                            dir="ltr"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="city">المدينة</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="اختر مدينتك"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">نبذة شخصية</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="اكتب نبذة مختصرة عن نفسك (250 حرف كحد أقصى)"
                          maxLength={250}
                          className="min-h-[100px]"
                        />
                        <div className="text-xs text-muted-foreground text-left">
                          {formData.bio.length}/250
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit">حفظ التغييرات</Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">الاسم الكامل</Label>
                          <p className="text-lg">{profile?.full_name || 'غير محدد'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</Label>
                          <p className="text-lg" dir="ltr">{user.email}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">رقم الجوال</Label>
                          <p className="text-lg" dir="ltr">{profile?.phone || 'غير محدد'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">المدينة</Label>
                          <p className="text-lg">{profile?.city || 'غير محدد'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">نوع الحساب</Label>
                          <p className="text-lg">{getRoleDisplay()}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">تاريخ الانضمام</Label>
                          <p className="text-lg">
                            {new Date(user.created_at).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                      
                      {profile?.bio && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">النبذة الشخصية</Label>
                          <p className="text-lg mt-1">{profile.bio}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    المحفظة المالية
                  </CardTitle>
                  <CardDescription>إدارة رصيدك ومعاملاتك المالية</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">قسم المحفظة قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Points Tab */}
            <TabsContent value="points">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    نظام النقاط
                  </CardTitle>
                  <CardDescription>رصيد نقاطك ومكافآتك</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-8">
                    <p className="text-muted-foreground">قسم النقاط قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>التقييمات والمراجعات</CardTitle>
                  <CardDescription>التقييمات التي تلقيتها من المستخدمين</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>أ</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">أحمد محمد</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">منذ يومين</span>
                      </div>
                      <p className="text-sm">
                        تجربة رائعة! التنظيم كان ممتاز والخدمة المقدمة تفوق التوقعات. 
                        أنصح بشدة بالتعامل معهم.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>س</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">سارة العتيبي</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((star) => (
                                <Star key={star} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">منذ أسبوع</span>
                      </div>
                      <p className="text-sm">
                        فعالية جميلة وتنظيم جيد، لكن كان هناك تأخير بسيط في البداية. 
                        بشكل عام تجربة ممتعة.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;