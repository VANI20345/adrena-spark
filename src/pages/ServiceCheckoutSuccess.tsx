import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone,
  Hash,
  Home,
  CreditCard,
  Share2
} from 'lucide-react';

interface BookingDetails {
  id: string;
  booking_reference: string;
  service_date: string;
  total_amount: number;
  status: string;
  special_requests: string | null;
  services: {
    name_ar: string;
    name: string;
    image_url: string | null;
    duration_minutes: number | null;
    location_ar: string | null;
    location: string | null;
  };
  profiles: {
    full_name: string;
    phone: string;
  };
}

const ServiceCheckoutSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const { serviceBookingId, paymentId } = location.state || {};
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (!serviceBookingId) {
      navigate('/');
      return;
    }
    fetchBookingDetails();
  }, [serviceBookingId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select(`
          id,
          booking_reference,
          service_date,
          total_amount,
          status,
          special_requests,
          services!service_id(name_ar, name, image_url, duration_minutes, location_ar, location),
          profiles!provider_id(full_name, phone)
        `)
        .eq('id', serviceBookingId)
        .single();

      if (error) throw error;
      setBooking(data as unknown as BookingDetails);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: isRTL ? 'حجزت خدمة!' : 'I booked a service!',
      text: isRTL 
        ? `حجزت خدمة ${booking?.services?.name_ar}`
        : `I booked ${booking?.services?.name}`,
      url: window.location.origin
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
        <main className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {isRTL ? 'لم يتم العثور على الحجز' : 'Booking not found'}
          </h1>
          <Button asChild>
            <Link to="/">{isRTL ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isRTL ? 'تم الحجز بنجاح!' : 'Booking Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'تم تأكيد حجزك وإرسال إشعار لمقدم الخدمة'
                : 'Your booking has been confirmed and the provider has been notified'}
            </p>
          </div>

          {/* Booking Reference */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">
                    {isRTL ? 'رقم الحجز:' : 'Booking Reference:'}
                  </span>
                </div>
                <Badge variant="outline" className="text-lg font-mono px-4 py-2">
                  {booking.booking_reference}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {isRTL ? 'تفاصيل الخدمة' : 'Service Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {booking.services?.image_url && (
                  <img 
                    src={booking.services.image_url} 
                    alt={isRTL ? booking.services.name_ar : booking.services.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {isRTL ? booking.services?.name_ar : booking.services?.name}
                  </h3>
                  {(isRTL ? booking.services?.location_ar : booking.services?.location) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      {isRTL ? booking.services.location_ar : booking.services.location}
                    </div>
                  )}
                  {booking.services?.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      {booking.services.duration_minutes} {isRTL ? 'دقيقة' : 'minutes'}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {isRTL ? 'تاريخ الخدمة' : 'Service Date'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {new Date(booking.service_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {booking.total_amount?.toLocaleString()} {isRTL ? 'ر.س' : 'SAR'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Provider Info */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'مقدم الخدمة' : 'Service Provider'}
                </p>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.profiles?.full_name}</p>
                    {booking.profiles?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {booking.profiles.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {booking.special_requests && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {isRTL ? 'طلبات خاصة' : 'Special Requests'}
                    </p>
                    <p className="text-foreground">{booking.special_requests}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {isRTL ? 'حالة الحجز' : 'Booking Status'}
                </span>
                <Badge variant="default" className="bg-green-600">
                  {booking.status === 'confirmed' 
                    ? (isRTL ? 'مؤكد' : 'Confirmed')
                    : booking.status === 'pending' 
                    ? (isRTL ? 'قيد الانتظار' : 'Pending') 
                    : booking.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link to="/" className="gap-2">
                <Home className="h-4 w-4" />
                {isRTL ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
              </Link>
            </Button>
            <Button variant="outline" onClick={handleShare} className="flex-1">
              <Share2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/services">
                {isRTL ? 'تصفح المزيد من الخدمات' : 'Browse More Services'}
              </Link>
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRTL 
              ? 'سيتواصل معك مقدم الخدمة قريباً لتأكيد التفاصيل'
              : 'The service provider will contact you soon to confirm the details'}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceCheckoutSuccess;
