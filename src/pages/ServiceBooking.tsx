import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  User,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  MapPin,
  CreditCard,
} from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Service {
  id: string;
  provider_id: string;
  name: string;
  name_ar: string;
  price: number;
  image_url: string | null;
  profiles?: {
    full_name: string;
    phone: string;
    avatar_url: string;
  };
}

const ServiceBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [service, setService] = useState<Service | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول أولاً لحجز الخدمة",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (id) {
      fetchServiceAndProfile();
    }
  }, [id, user]);

  const fetchServiceAndProfile = async () => {
    if (!id || !user) return;

    try {
      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`
          *,
          provider:profiles!provider_id(full_name, avatar_url, phone)
        `)
        .eq('id', id)
        .single();
      
      if (serviceError) throw serviceError;
      setService(serviceData as unknown as Service);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;
      setUserProfile(profileData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
      navigate('/services');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!service || !user || !selectedDate) return;

    setBookingLoading(true);
    try {
      // Create booking reference
      const bookingReference = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create service booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('service_bookings')
        .insert({
          service_id: service.id,
          user_id: user.id,
          provider_id: service.provider_id,
          booking_date: new Date().toISOString(),
          service_date: selectedDate.toISOString(),
          total_amount: service.price,
          special_requests: specialRequests,
          status: service.price === 0 ? 'confirmed' : 'pending_payment',
          booking_reference: bookingReference
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const newBookingId = bookingData.id;

      // Send notification to provider about new booking (don't let it block the booking)
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: service.provider_id,
            type: 'service_booking',
            title: 'حجز خدمة جديد',
            message: `لديك حجز جديد من ${userProfile?.full_name || 'عميل'} لخدمة ${service.name_ar || service.name} بتاريخ ${format(selectedDate, 'dd/MM/yyyy', { locale: ar })}`,
            data: {
              booking_id: newBookingId,
              service_id: service.id,
              user_id: user.id,
              booking_date: selectedDate.toISOString(),
              status: service.price === 0 ? 'confirmed' : 'pending_payment',
              user_info: {
                name: userProfile?.full_name,
                phone: userProfile?.phone,
                avatar: userProfile?.avatar_url
              }
            }
          });
      } catch (notificationError) {
        console.error('Notification error (non-blocking):', notificationError);
      }

      // If service is free, redirect to success page
      if (service.price === 0) {
        toast({
          title: "تم الحجز بنجاح",
          description: "تم حجز الخدمة المجانية بنجاح",
        });
        navigate('/service-checkout/success', {
          state: {
            serviceBookingId: bookingData.id,
            isFree: true
          }
        });
      } else {
        // Redirect to payment gateway with state
        toast({
          title: "جاري التحويل للدفع",
          description: "سيتم تحويلك إلى بوابة الدفع...",
        });
        
        setTimeout(() => {
          navigate('/checkout', {
            state: {
              serviceBookingId: bookingData.id,
              serviceTitle: service.name_ar || service.name,
              servicePrice: service.price,
              bookingType: 'service',
              availableSeats: 1
            }
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "خطأ في الحجز",
        description: "حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-xl">جاري التحميل...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-xl text-muted-foreground">الخدمة غير موجودة</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">حجز الخدمة</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Service & Provider Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Info */}
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الخدمة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {service.image_url && (
                      <img 
                        src={service.image_url} 
                        alt={service.name_ar}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{service.name_ar || service.name}</h3>
                      <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <DollarSign className="w-5 h-5" />
                        {service.price === 0 ? 'مجاني' : `${service.price} ريال`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Provider Info */}
              <Card>
                <CardHeader>
                  <CardTitle>مقدم الخدمة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={service.profiles?.avatar_url} />
                      <AvatarFallback>
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{service.profiles?.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {service.profiles?.phone}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Your Info */}
              <Card>
                <CardHeader>
                  <CardTitle>معلوماتك</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarImage src={userProfile?.avatar_url} />
                      <AvatarFallback>
                        {userProfile?.full_name?.[0] || '؟'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{userProfile?.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {userProfile?.phone}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل الحجز</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">اختر تاريخ الخدمة</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ar}
                      className="rounded-md border"
                      disabled={(date) => date < new Date()}
                    />
                  </div>

                  <div>
                    <Label htmlFor="requests" className="mb-2 block">
                      ملاحظات أو طلبات خاصة (اختياري)
                    </Label>
                    <Textarea
                      id="requests"
                      placeholder="أضف أي ملاحظات أو طلبات خاصة..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Booking Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>ملخص الحجز</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الخدمة:</span>
                      <span className="font-medium">{service.name_ar}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">التاريخ:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ar }) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الحالة:</span>
                      <Badge variant={service.price === 0 ? "default" : "secondary"}>
                        {service.price === 0 ? 'بانتظار التأكيد' : 'بانتظار الدفع'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">الإجمالي:</span>
                      <span className="text-2xl font-bold text-primary">
                        {service.price === 0 ? 'مجاني' : `${service.price} ريال`}
                      </span>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={!selectedDate || bookingLoading}
                      className="w-full"
                      size="lg"
                    >
                      <CreditCard className="w-4 h-4 ml-2" />
                      {bookingLoading 
                        ? 'جاري الحجز...' 
                        : service.price === 0 
                          ? 'تأكيد الحجز' 
                          : 'متابعة للدفع'
                      }
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      بالنقر على الزر أعلاه، فإنك توافق على شروط الخدمة
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ServiceBooking;