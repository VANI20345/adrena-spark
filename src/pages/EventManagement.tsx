import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabaseServices } from '@/services/supabaseServices';
import { QRCodeGenerator } from '@/components/QR/QRCodeGenerator';
import { QRScanner } from '@/components/QR/QRScanner';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  Calendar, 
  Users, 
  MapPin, 
  QrCode, 
  Settings, 
  Eye,
  CheckCircle,
  Clock,
  DollarSign,
  Share2
} from 'lucide-react';

const EventManagement = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Load event details
  const { data: event, isLoading } = useSupabaseQuery({
    queryKey: ['event-details', eventId],
    queryFn: () => supabaseServices.events.getById(eventId || ''),
    enabled: !!eventId
  });

  // Load event bookings
  const { data: bookings = [] } = useSupabaseQuery({
    queryKey: ['event-bookings', eventId],
    queryFn: () => supabaseServices.bookings.getByEvent(eventId || ''),
    enabled: !!eventId
  });

  // Load event tickets
  const { data: tickets = [] } = useSupabaseQuery({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      const { data, error } = await supabaseServices.supabase
        .from('tickets')
        .select(`
          *,
          bookings!inner(event_id, user_id)
        `)
        .eq('bookings.event_id', eventId);

      if (error) throw error;
      return data;
    },
    enabled: !!eventId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('loading', 'جاري التحميل...')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('eventNotFound', 'الفعالية غير موجودة')}</h1>
            <Button onClick={() => navigate('/organizer-dashboard')}>
              {t('backToDashboard', 'العودة للوحة التحكم')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum, booking) => sum + Number(booking.total_amount), 0),
    checkedIn: tickets.filter(t => t.checked_in_at).length,
    remaining: (event.max_attendees || 0) - (event.current_attendees || 0)
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{event.title_ar || event.title}</h1>
              <p className="text-muted-foreground">
                {new Date(event.start_date).toLocaleDateString('ar-SA')} • {event.location_ar || event.location}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/event/${eventId}`)}>
                <Eye className="h-4 w-4 ml-2" />
                {t('preview', 'معاينة')}
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 ml-2" />
                {t('share', 'مشاركة')}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                    <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الإيرادات</p>
                    <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} ريال</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الحضور المسجل</p>
                    <p className="text-2xl font-bold">{stats.checkedIn}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الأماكن المتبقية</p>
                    <p className="text-2xl font-bold">{stats.remaining}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="attendees">الحضور</TabsTrigger>
            <TabsTrigger value="checkin">تسجيل الحضور</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الفعالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">الوصف</p>
                    <p>{event.description_ar || event.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ البداية</p>
                      <p>{new Date(event.start_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ النهاية</p>
                      <p>{new Date(event.end_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">السعر</p>
                      <p>{event.price} ريال</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الحد الأقصى</p>
                      <p>{event.max_attendees} مشارك</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>QR Code للفعالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <QRCodeGenerator 
                    eventId={eventId || ''}
                    eventTitle={event.title_ar || event.title}
                    organizerId={user?.id || ''}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>قائمة الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">حجز #{booking.booking_reference}</h4>
                        <p className="text-sm text-muted-foreground">
                          {booking.quantity} تذكرة • {booking.total_amount} ريال
                        </p>
                      </div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status === 'confirmed' ? 'مؤكد' : 'معلق'}
                      </Badge>
                    </div>
                  ))}
                  
                  {bookings.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('noBookings', 'لا توجد حجوزات بعد')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ماسح QR للحضور</CardTitle>
                </CardHeader>
                <CardContent>
                  <QRScanner
                    eventId={eventId || ''}
                    eventTitle={event.title_ar || event.title}
                    onScanSuccess={(ticket) => {
                      console.log('Ticket scanned:', ticket);
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات الحضور</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>المسجلون</span>
                    <span className="font-bold">{stats.checkedIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتبقون</span>
                    <span className="font-bold">{stats.totalBookings - stats.checkedIn}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${stats.totalBookings > 0 ? (stats.checkedIn / stats.totalBookings) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent check-ins */}
            <Card>
              <CardHeader>
                <CardTitle>آخر التسجيلات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tickets.filter(t => t.checked_in_at).slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{ticket.holder_name}</p>
                        <p className="text-sm text-muted-foreground">تذكرة #{ticket.ticket_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{new Date(ticket.checked_in_at).toLocaleTimeString('ar-SA')}</p>
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          مسجل
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الفعالية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 ml-2" />
                    تعديل تفاصيل الفعالية
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 ml-2" />
                    إدارة المشاركين
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <QrCode className="h-4 w-4 ml-2" />
                    تحديث QR Code
                  </Button>
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

export default EventManagement;