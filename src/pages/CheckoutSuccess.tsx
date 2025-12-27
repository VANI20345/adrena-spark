import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
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
  Ticket,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const isRTL = language === 'ar';
  
  const { bookingId, bookingReference, eventId: stateEventId, tickets: stateTickets, total: stateTotal } = location.state || {};

  useEffect(() => {
    if (user) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingId, bookingReference, user]);

  const fetchBookingDetails = async () => {
    try {
      // Try to find booking by ID first, then by reference
      let query = supabase
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
        .eq('user_id', user?.id);

      if (bookingId) {
        query = query.eq('id', bookingId);
      } else if (bookingReference) {
        query = query.eq('booking_reference', bookingReference);
      } else {
        // Fallback: get most recent booking
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data: bookingData, error: bookingError } = await query.maybeSingle();

      if (bookingError) throw bookingError;

      if (bookingData) {
        setBooking(bookingData);
        setEvent(bookingData.events);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: isRTL ? 'حجزت تذكرة!' : 'I booked a ticket!',
      text: isRTL 
        ? `حجزت تذكرة لفعالية ${event?.title_ar}`
        : `I booked a ticket for ${event?.title}`,
      url: window.location.origin + `/events/${event?.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: isRTL ? 'تم النسخ' : 'Copied',
          description: isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
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
            <h1 className="text-2xl font-bold mb-4">
              {isRTL ? 'لم يتم العثور على الحجز' : 'Booking not found'}
            </h1>
            <Button asChild>
              <Link to="/my-events">
                {isRTL ? 'قائمة فعالياتي' : 'My Events'}
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">
              {isRTL ? 'تم الحجز بنجاح!' : 'Booking Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'تم إرسال تأكيد الحجز إلى بريدك الإلكتروني ورسالة SMS'
                : 'Booking confirmation has been sent to your email and SMS'}
            </p>
          </div>

          {/* Booking Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                {isRTL ? 'تفاصيل الحجز' : 'Booking Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isRTL ? 'رقم الحجز:' : 'Booking Reference:'}
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {booking.booking_reference}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isRTL ? 'الفعالية:' : 'Event:'}
                  </span>
                  <span className="font-semibold">{isRTL ? event.title_ar : event.title}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isRTL ? 'التاريخ:' : 'Date:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isRTL ? 'المكان:' : 'Location:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{isRTL ? event.location_ar : event.location}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {isRTL ? 'عدد التذاكر:' : 'Tickets:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{booking.quantity} {isRTL ? 'تذكرة' : 'ticket(s)'}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>{isRTL ? 'المبلغ المدفوع:' : 'Total Paid:'}</span>
                  <span>{booking.total_amount} {isRTL ? 'ريال' : 'SAR'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isRTL ? 'الخطوات التالية' : 'Next Steps'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Download className="w-6 h-6 text-blue-600" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-semibold">
                      {isRTL ? 'حمّل تذاكرك' : 'Download Your Tickets'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'ستحتاج لإظهارها عند الوصول للفعالية'
                        : "You'll need to show them at the event entrance"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-semibold">
                      {isRTL ? 'انضم لقروب الفعالية' : 'Join Event Group'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'تواصل مع المشاركين الآخرين واحصل على التحديثات'
                        : 'Connect with other attendees and get updates'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-semibold">
                      {isRTL ? 'احصل على النقاط' : 'Earn Points'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'ستحصل على نقاط الولاء بعد حضور الفعالية'
                        : "You'll earn loyalty points after attending the event"}
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
                <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'عرض التذاكر' : 'View Tickets'}
              </Link>
            </Button>
            
            <Button variant="outline" onClick={handleShare} className="w-full">
              <Share2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/groups">
                <MessageCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'المجموعات' : 'Groups'}
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/my-events">
                {isRTL ? 'حجوزاتي' : 'My Bookings'}
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