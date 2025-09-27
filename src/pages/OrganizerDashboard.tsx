import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { DashboardStats } from '@/components/Dashboard/DashboardStats';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabaseServices } from '@/services/supabaseServices';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Wallet,
  Plus,
  Eye,
  Settings,
  QrCode,
  MapPin,
  Clock,
  Star,
  DollarSign
} from 'lucide-react';

const OrganizerDashboard = () => {
  const { user, profile } = useAuth();
  const { t, language } = useLanguageContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load real data from Supabase
  const { data: events = [], isLoading: eventsLoading } = useSupabaseQuery({
    queryKey: ['organizer-events', user?.id],
    queryFn: () => supabaseServices.events.getByOrganizer(user?.id || ''),
    enabled: !!user?.id
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useSupabaseQuery({
    queryKey: ['organizer-bookings', user?.id],
    queryFn: () => supabaseServices.bookings.getByOrganizer(user?.id || ''),
    enabled: !!user?.id
  });

  // Calculate stats from real data
  const stats = {
    totalEvents: Array.isArray(events) ? events.length : 0,
    totalRevenue: Array.isArray(bookings) ? bookings.reduce((sum, booking) => sum + Number(booking.total_amount), 0) : 0,
    totalAttendees: Array.isArray(bookings) ? bookings.filter(b => b.status === 'confirmed').length : 0,
    activeEvents: Array.isArray(events) ? events.filter(e => e.status === 'active').length : 0,
    avgRating: 4.7 // This would come from reviews
  };

  const recentBookings = Array.isArray(bookings) 
    ? bookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                مرحباً، {profile?.full_name || 'المنظم'}!
              </h1>
              <p className="text-muted-foreground">
                إدارة فعالياتك ومتابعة أداء أعمالك
              </p>
            </div>
            <Button 
              className="gap-2"
              onClick={() => navigate('/create-event')}
            >
              <Plus className="h-4 w-4" />
              {t('createNewEvent', 'إنشاء فعالية جديدة')}
            </Button>
          </div>

          {/* Stats Cards */}
          <DashboardStats 
            userRole="organizer" 
            stats={stats}
            isLoading={eventsLoading || bookingsLoading}
          />

          {/* Active Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  فعالياتي النشطة
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/manage-events')}
                >
                  {t('viewAll', 'عرض الكل')}
                </Button>
              </div>
              <CardDescription>
                الفعاليات المتاحة للحجز حالياً
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(events) ? events.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0">
                      {event.image_url && (
                        <img 
                          src={event.image_url} 
                          alt={event.title_ar || event.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title_ar || event.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.start_date).toLocaleDateString('ar-SA')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location_ar || event.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">
                          {event.current_attendees || 0}/{event.max_attendees} مشارك
                        </Badge>
                        <Badge variant="outline">
                          {(event.price || 0).toLocaleString()} ريال
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                        {t('view', 'عرض')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => navigate('/qr-scanner')}
                      >
                        <QrCode className="h-3 w-3" />
                        QR
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => navigate(`/manage-events?edit=${event.id}`)}
                      >
                        <Settings className="h-3 w-3" />
                        {t('manage', 'إدارة')}
                      </Button>
                    </div>
                  </div>
                )) : []}
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  الحجوزات الأخيرة
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                آخر الحجوزات على فعالياتك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.isArray(recentBookings) ? recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">حجز رقم #{booking.booking_reference}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    
                    <div className="text-left">
                      <p className="font-medium">{booking.amount} ريال</p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short'
                        }).format(booking.date)}
                      </p>
                    </div>
                    
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                      {booking.status === 'confirmed' ? 'مؤكد' : 'قيد المراجعة'}
                    </Badge>
                  </div>
                )) : []}
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
              <div className="grid gap-4 md:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/create-event')}
                >
                  <Plus className="h-6 w-6" />
                  <span>{t('createEvent.title', 'إنشاء فعالية')}</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/qr-scanner')}
                >
                  <QrCode className="h-6 w-6" />
                  <span>{t('qrScanner', 'ماسح QR')}</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/wallet')}
                >
                  <Wallet className="h-6 w-6" />
                  <span>{t('wallet.title', 'المحفظة')}</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col gap-2"
                  onClick={() => navigate('/dashboard')}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>{t('reports', 'التقارير')}</span>
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

export default OrganizerDashboard;