import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Users, 
  Download,
  MessageCircle,
  Star,
  Ticket
} from 'lucide-react';

interface BookingData {
  id: string;
  booking_reference: string;
  quantity: number;
  total_amount: number;
  event_id: string;
  status: string;
}

interface EventData {
  id: string;
  title: string;
  title_ar: string;
  start_date: string;
  location: string;
  location_ar: string;
  organizer_id: string;
}

const CheckoutSuccess = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { bookingId } = location.state || {};

  useEffect(() => {
    if (bookingId && user) {
      fetchBookingDetails();
    }
  }, [bookingId, user]);

  const fetchBookingDetails = async () => {
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            title_ar,
            start_date,
            location,
            location_ar,
            organizer_id
          )
        `)
        .eq('id', bookingId)
        .eq('user_id', user?.id)
        .single();

      if (bookingError) throw bookingError;

      setBooking(bookingData);
      setEvent(bookingData.events);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">لم يتم العثور على الحجز</h1>
            <Button asChild>
              <Link to="/explore">تصفح الفعاليات</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">تم الحجز بنجاح!</h1>
            <p className="text-muted-foreground">
              تم إرسال تأكيد الحجز إلى بريدك الإلكتروني ورسالة SMS
            </p>
          </div>

          {/* Booking Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                تفاصيل الحجز
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">رقم الحجز:</span>
                  <Badge variant="outline" className="font-mono">
                    {booking.booking_reference}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الفعالية:</span>
                  <span className="font-semibold">{event.title_ar}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">التاريخ:</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.start_date).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">المكان:</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location_ar}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">عدد التذاكر:</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{booking.quantity} تذكرة</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>المبلغ المدفوع:</span>
                  <span>{booking.total_amount} ريال</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>الخطوات التالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Download className="w-6 h-6 text-blue-600" />
                  <div className="text-right">
                    <p className="font-semibold">حمّل تذاكرك</p>
                    <p className="text-sm text-muted-foreground">
                      ستحتاج لإظهارها عند الوصول للفعالية
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  <div className="text-right">
                    <p className="font-semibold">انضم لقروب الفعالية</p>
                    <p className="text-sm text-muted-foreground">
                      تواصل مع المشاركين الآخرين واحصل على التحديثات
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                  <div className="text-right">
                    <p className="font-semibold">احصل على النقاط</p>
                    <p className="text-sm text-muted-foreground">
                      ستحصل على نقاط الولاء بعد حضور الفعالية
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="w-full">
              <Link to="/tickets">
                <Download className="w-4 h-4 mr-2" />
                عرض التذاكر
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to={`/groups?event=${event.id}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                انضم للمجموعة
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/explore">
                تصفح المزيد من الفعاليات
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/my-events">
                حجوزاتي
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;