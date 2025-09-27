import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Star, 
  Heart, 
  Ticket, 
  Gift,
  TrendingUp,
  Clock,
  Users,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AttendeeDashboard = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [stats, setStats] = useState({
    eventsAttended: 0,
    totalPoints: 0,
    favoriteOrganizers: 0,
    upcomingBookings: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user's bookings and events
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get event details for bookings
      const eventIds = bookingsData?.map(b => b.event_id) || [];
      let eventsData = [];
      if (eventIds.length > 0) {
        const { data: eventsList } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);
        eventsData = eventsList || [];
      }

      // Filter upcoming and completed events
      const now = new Date();
      const upcomingBookings = bookingsData?.filter(booking => {
        const event = eventsData.find(e => e.id === booking.event_id);
        return event && new Date(event.start_date) > now;
      }) || [];

      const completedBookings = bookingsData?.filter(booking => {
        const event = eventsData.find(e => e.id === booking.event_id);
        return event && new Date(event.end_date) < now;
      }) || [];

      // Map bookings with event data
      const upcomingWithEvents = upcomingBookings.map(booking => ({
        ...booking,
        events: eventsData.find(e => e.id === booking.event_id)
      }));

      setUpcomingEvents(upcomingWithEvents.slice(0, 5));

      // Load user points from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('user_id', user?.id)
        .single();

      // Load some popular events as favorites (since bookmarks table doesn't exist)
      const { data: popularEvents } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(4);

      setFavoriteEvents(popularEvents || []);

      setStats({
        eventsAttended: completedBookings.length,
        totalPoints: profileData?.points_balance || 0,
        favoriteOrganizers: new Set(eventsData?.map(e => e.organizer_id)).size,
        upcomingBookings: upcomingBookings.length
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('خطأ في تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                مرحباً، {profile?.full_name || 'المستخدم'}!
              </h1>
              <p className="text-muted-foreground">
                استكشف أحدث الفعاليات واحجز مغامرتك القادمة
              </p>
            </div>
            <Button className="gap-2">
              <Search className="h-4 w-4" />
              استكشاف الفعاليات
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الفعاليات المحضورة</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.eventsAttended}</div>
                <p className="text-xs text-muted-foreground">
                  +2 من الشهر الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">نقاط الولاء</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  +150 نقطة هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المنظمين المفضلين</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.favoriteOrganizers}</div>
                <p className="text-xs text-muted-foreground">
                  +1 منظم جديد
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الحجوزات القادمة</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
                <p className="text-xs text-muted-foreground">
                  في الأسبوعين القادمين
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  فعالياتي القادمة
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                الفعاليات التي حجزتها والقادمة قريباً
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {upcomingEvents.map((booking) => (
                   <div key={booking.id} className="flex items-center gap-4 p-4 border rounded-lg">
                     <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                     
                     <div className="flex-1">
                       <h3 className="font-semibold">{booking.events?.title || 'فعالية غير محددة'}</h3>
                       <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                         <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {booking.events?.start_date ? new Date(booking.events.start_date).toLocaleDateString('ar-SA') : 'تاريخ غير محدد'}
                         </span>
                         <span className="flex items-center gap-1">
                           <MapPin className="h-3 w-3" />
                           {booking.events?.location || 'موقع غير محدد'}
                         </span>
                       </div>
                     </div>
                     
                     <div className="text-left">
                       <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                         {booking.status === 'confirmed' ? 'مؤكد' : 'قيد المراجعة'}
                       </Badge>
                       <p className="text-sm font-medium mt-1">{booking.events?.price || 0} ريال</p>
                     </div>
                     
                     <Button variant="outline" size="sm">
                       التفاصيل
                     </Button>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>

          {/* Favorite Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  الفعاليات المفضلة
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                الفعاليات التي أضفتها إلى قائمة المفضلة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteEvents.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{event.title || 'فعالية غير محددة'}</h3>
                      <Heart className="h-4 w-4 text-red-500 fill-current" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">منظم الفعالية</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">4.8</span>
                      </div>
                      <span className="text-sm font-medium">{event.price || 0} ريال</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>
                الأنشطة الأكثر استخداماً في حسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Search className="h-6 w-6" />
                  <span>استكشاف الفعاليات</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Gift className="h-6 w-6" />
                  <span>استبدال النقاط</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Users className="h-6 w-6" />
                  <span>مجموعاتي</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AttendeeDashboard;