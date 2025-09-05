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
  Users,
  DollarSign,
  Plus,
  TrendingUp,
  MapPin,
  Clock,
  Star,
  QrCode,
  MessageSquare,
  Settings,
  BarChart3
} from 'lucide-react';

const OrganizerDashboard = () => {
  const { userRole, user, loading } = useAuth();
  const [stats, setStats] = useState({
    activeEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  const [myEvents, setMyEvents] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    if (userRole === 'organizer' && user) {
      loadOrganizerData();
    }
  }, [userRole, user]);

  const loadOrganizerData = async () => {
    try {
      // Load organizer's events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id);

      // Load bookings for organizer's events
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          events!inner(organizer_id, title_ar)
        `)
        .eq('events.organizer_id', user.id);

      // Calculate stats
      const activeEvents = eventsData?.filter(event => event.status === 'active').length || 0;
      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;

      setStats({
        activeEvents,
        totalBookings,
        totalRevenue,
        averageRating: 4.2 // This would come from reviews
      });

      setMyEvents(eventsData || []);
      setRecentBookings(bookingsData?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error loading organizer data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'organizer') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة المنظم</h1>
          <p className="text-muted-foreground">إدارة فعالياتك ومتابعة أداءك</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="events">فعالياتي</TabsTrigger>
            <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="groups">القروبات</TabsTrigger>
            <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الفعاليات النشطة</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeEvents}</div>
                  <p className="text-xs text-muted-foreground">+2 عن الشهر الماضي</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                  <p className="text-xs text-muted-foreground">+12% هذا الشهر</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} ر.س</div>
                  <p className="text-xs text-muted-foreground">+8% عن الشهر الماضي</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageRating}/5</div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-4 h-4 ${star <= stats.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
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
                    <Link to="/create-event">
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء فعالية جديدة
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    <QrCode className="w-4 h-4 ml-2" />
                    مسح QR للحضور
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    إدارة القروبات
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 ml-2" />
                    تقارير مفصلة
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>أحدث الحجوزات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.events?.title_ar}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.quantity} × {booking.total_amount} ر.س
                          </p>
                        </div>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status === 'confirmed' ? 'مؤكد' : 'معلق'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">فعالياتي</h2>
              <Button asChild>
                <Link to="/create-event">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء فعالية جديدة
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEvents.map((event: any) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                        {event.status === 'active' ? 'نشط' : event.status === 'pending' ? 'معلق' : 'منتهي'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{event.title_ar}</CardTitle>
                    <CardDescription>{event.description_ar}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 ml-2" />
                        {event.location_ar}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-2" />
                        {new Date(event.start_date).toLocaleDateString('ar-SA')}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 ml-2" />
                        {event.current_attendees} / {event.max_attendees || 'غير محدود'}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 ml-2" />
                        {event.price} ر.س
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline">عرض</Button>
                      <Button size="sm" variant="outline">تعديل</Button>
                      <Button size="sm" variant="outline">إدارة</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة الحجوزات</CardTitle>
                <CardDescription>جميع حجوزات فعالياتك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBookings.map((booking: any) => (
                    <div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{booking.events?.title_ar}</h4>
                          <p className="text-sm text-muted-foreground">
                            المرجع: {booking.booking_reference}
                          </p>
                        </div>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status === 'confirmed' ? 'مؤكد' : 'معلق'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span>الكمية: {booking.quantity}</span>
                          <span className="mx-2">•</span>
                          <span>المبلغ: {booking.total_amount} ر.س</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">عرض</Button>
                          <Button size="sm" variant="outline">
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>قروبات الفعاليات</CardTitle>
                <CardDescription>إدارة قروبات الدردشة لفعالياتك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">نظام القروبات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليلات الأداء</CardTitle>
                <CardDescription>إحصائيات مفصلة عن فعالياتك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">تحليلات مفصلة قيد التطوير</p>
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

export default OrganizerDashboard;