import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  Calendar,
  MapPin,
  Clock,
  Star,
  QrCode,
  MessageSquare,
  Search,
  Gift,
  Heart,
  Users,
  Award,
  Ticket
} from 'lucide-react';

const AttendeeDashboard = () => {
  const { userRole, user, loading } = useAuth();
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    completedEvents: 0,
    totalPoints: 0,
    currentLevel: 'مبتدئ'
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);

  useEffect(() => {
    if (userRole === 'attendee' && user) {
      loadAttendeeData();
    }
  }, [userRole, user]);

  const loadAttendeeData = async () => {
    try {
      // Load user's bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          events(*)
        `)
        .eq('user_id', user.id);

      // Load user profile for points
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points_balance, total_points_earned')
        .eq('user_id', user.id)
        .single();

      // Separate upcoming and past events
      const now = new Date();
      const upcoming = bookingsData?.filter(booking => 
        new Date(booking.events.start_date) > now
      ) || [];
      const past = bookingsData?.filter(booking => 
        new Date(booking.events.start_date) <= now
      ) || [];

      setStats({
        upcomingEvents: upcoming.length,
        completedEvents: past.length,
        totalPoints: profileData?.points_balance || 0,
        currentLevel: getUserLevel(profileData?.total_points_earned || 0)
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);

    } catch (error) {
      console.error('Error loading attendee data:', error);
    }
  };

  const getUserLevel = (totalPoints: number) => {
    if (totalPoints >= 1000) return 'خبير';
    if (totalPoints >= 500) return 'متقدم';
    if (totalPoints >= 100) return 'متوسط';
    return 'مبتدئ';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'attendee') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة المشارك</h1>
          <p className="text-muted-foreground">تابع فعالياتك واكسب نقاط الولاء</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="upcoming">الفعاليات القادمة</TabsTrigger>
            <TabsTrigger value="history">التاريخ</TabsTrigger>
            <TabsTrigger value="favorites">المفضلة</TabsTrigger>
            <TabsTrigger value="groups">القروبات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الفعاليات القادمة</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                  <p className="text-xs text-muted-foreground">محجوزة ومؤكدة</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الفعاليات المكتملة</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedEvents}</div>
                  <p className="text-xs text-muted-foreground">تم حضورها</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">نقاط الولاء</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPoints}</div>
                  <p className="text-xs text-muted-foreground">نقطة متاحة</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المستوى الحالي</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.currentLevel}</div>
                  <p className="text-xs text-muted-foreground">مغامر</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إجراءات سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full">
                    <Link to="/explore">
                      <Search className="w-4 h-4 ml-2" />
                      استكشف فعاليات جديدة
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    <QrCode className="w-4 h-4 ml-2" />
                    مسح QR لتأكيد الحضور
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    قروبات المناطق
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/points">
                      <Gift className="w-4 h-4 ml-2" />
                      استخدم نقاط الولاء
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الفعاليات القادمة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingBookings.slice(0, 3).map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.events?.title_ar}</p>
                          <p className="text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 inline ml-1" />
                            {new Date(booking.events?.start_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <Badge variant="default">مؤكد</Badge>
                      </div>
                    ))}
                    {upcomingBookings.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">لا توجد فعاليات قادمة</p>
                        <Button asChild className="mt-2">
                          <Link to="/explore">استكشف الفعاليات</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>إنجازاتك الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-semibold">مستكشف نشط</h4>
                    <p className="text-sm text-muted-foreground">حضور 5 فعاليات</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-semibold">مقيم موثوق</h4>
                    <p className="text-sm text-muted-foreground">5 تقييمات مفيدة</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <h4 className="font-semibold">محب للمغامرة</h4>
                    <p className="text-sm text-muted-foreground">أول مشاركة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">الفعاليات القادمة</h2>
              <Button asChild>
                <Link to="/explore">
                  <Search className="w-4 h-4 ml-2" />
                  اكتشف المزيد
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBookings.map((booking: any) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="default">مؤكد</Badge>
                      <Badge variant="outline">
                        <Ticket className="w-3 h-3 ml-1" />
                        {booking.quantity}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{booking.events?.title_ar}</CardTitle>
                    <CardDescription>{booking.events?.description_ar}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 ml-2" />
                        {booking.events?.location_ar}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-2" />
                        {new Date(booking.events?.start_date).toLocaleDateString('ar-SA')}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 ml-2" />
                        {booking.events?.current_attendees} مشارك
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline">عرض التفاصيل</Button>
                      <Button size="sm" variant="outline">
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تاريخ الفعاليات</CardTitle>
                <CardDescription>الفعاليات التي حضرتها سابقاً</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pastBookings.map((booking: any) => (
                    <div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{booking.events?.title_ar}</h4>
                          <p className="text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 inline ml-1" />
                            {new Date(booking.events?.start_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <Badge variant="outline">مكتمل</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Star className="w-4 h-4 ml-1" />
                          تقييم
                        </Button>
                        <Button size="sm" variant="outline">عرض التفاصيل</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الفعاليات المفضلة</CardTitle>
                <CardDescription>الفعاليات التي أضفتها للمفضلة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لم تضف أي فعاليات للمفضلة بعد</p>
                  <Button asChild className="mt-4">
                    <Link to="/explore">اكتشف الفعاليات</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>قروبات المناطق</CardTitle>
                <CardDescription>انضم لقروبات منطقتك وتواصل مع المغامرين</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">نظام القروبات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AttendeeDashboard;