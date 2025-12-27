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

interface ServiceData {
  name_ar: string;
  name: string;
  image_url: string | null;
  duration_minutes: number | null;
  location_ar: string | null;
  location: string | null;
}

interface ProviderData {
  full_name: string | null;
  phone: string | null;
}

interface BookingData {
  id: string;
  booking_reference: string;
  service_date: string;
  total_amount: number;
  status: string;
  special_requests: string | null;
  service_id: string;
  provider_id: string;
}

const ServiceCheckoutSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const { serviceBookingId, paymentId } = location.state || {};
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [service, setService] = useState<ServiceData | null>(null);
  const [provider, setProvider] = useState<ProviderData | null>(null);
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
      // Step 1: Fetch booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('service_bookings')
        .select('id, booking_reference, service_date, total_amount, status, special_requests, service_id, provider_id')
        .eq('id', serviceBookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!bookingData) {
        setLoading(false);
        return;
      }
      
      setBooking(bookingData);

      // Step 2: Fetch service data
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('name_ar, name, image_url, duration_minutes, location_ar, location')
        .eq('id', bookingData.service_id)
        .maybeSingle();

      if (!serviceError && serviceData) {
        setService(serviceData);
      }

      // Step 3: Fetch provider data
      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', bookingData.provider_id)
        .maybeSingle();

      if (!providerError && providerData) {
        setProvider(providerData);
      }
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
        ? `حجزت خدمة ${service?.name_ar}`
        : `I booked ${service?.name}`,
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
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {t('serviceBooking.notFound')}
          </h1>
          <Button asChild>
            <Link to="/">{t('serviceBooking.backToHome')}</Link>
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
              {t('serviceBooking.successTitle')}
            </h1>
            <p className="text-muted-foreground">
              {t('serviceBooking.successDescription')}
            </p>
          </div>

          {/* Booking Reference */}
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">
                    {t('serviceBooking.bookingReference')}:
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
                {t('serviceBooking.serviceDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {service?.image_url && (
                  <img 
                    src={service.image_url} 
                    alt={isRTL ? service.name_ar : service.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {isRTL ? service?.name_ar : service?.name}
                  </h3>
                  {(isRTL ? service?.location_ar : service?.location) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      {isRTL ? service?.location_ar : service?.location}
                    </div>
                  )}
                  {service?.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      {service.duration_minutes} {isRTL ? 'دقيقة' : 'minutes'}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('serviceBooking.serviceDate')}
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
                    {t('serviceBooking.totalAmount')}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {booking.total_amount === 0 
                      ? t('serviceBooking.free')
                      : `${booking.total_amount?.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`
                    }
                  </p>
                </div>
              </div>

              <Separator />

              {/* Provider Info */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('serviceBooking.serviceProvider')}
                </p>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{provider?.full_name || '-'}</p>
                    {provider?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {provider.phone}
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
                      {t('serviceBooking.specialRequests')}
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
                  {t('serviceBooking.bookingStatus')}
                </span>
                <Badge variant="default" className="bg-green-600">
                  {booking.status === 'confirmed' 
                    ? t('serviceBooking.confirmed')
                    : booking.status === 'pending' 
                    ? t('serviceBooking.pending')
                    : booking.status === 'cancelled'
                    ? t('serviceBooking.cancelled')
                    : booking.status === 'completed'
                    ? t('serviceBooking.completed')
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
                {t('serviceBooking.backToHome')}
              </Link>
            </Button>
            <Button variant="outline" onClick={handleShare} className="flex-1">
              <Share2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('serviceBooking.share')}
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/services">
                {t('serviceBooking.browseMore')}
              </Link>
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('serviceBooking.providerContact')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceCheckoutSuccess;
