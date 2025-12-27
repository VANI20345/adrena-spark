import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Phone, DollarSign, CreditCard } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useLanguageContext } from "@/contexts/LanguageContext";
import BookingTimeRangeSelector from "@/components/Services/BookingTimeRangeSelector";

interface Service {
  id: string;
  provider_id: string;
  name: string;
  name_ar: string;
  price: number;
  original_price?: number | null;
  discount_percentage?: number | null;
  max_capacity?: number | null;
  image_url: string | null;
  availability_type?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  booking_duration_minutes?: number | null;
  provider?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

const ServiceBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguageContext();

  const [service, setService] = useState<Service | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const isArabic = language === "ar";
  const dateLocale = isArabic ? ar : enUS;

  const formatTime12h = (timeHHMM: string) => {
    const [h, m] = timeHHMM.split(":").map((x) => Number(x));
    const d = new Date(1970, 0, 1, h, m, 0);
    return d.toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    if (!user) {
      toast({
        title: t('serviceBooking.loginRequired'),
        description: t('serviceBooking.loginRequiredDesc'),
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
      // Fetch service details with provider info
      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select(
          `
          *,
          provider:profiles!provider_id(full_name, avatar_url, phone)
        `
        )
        .eq("id", id)
        .single();

      if (serviceError) throw serviceError;
      setService(serviceData as unknown as Service);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
        description: t("serviceBooking.loadError"),
        variant: "destructive",
      });
      navigate("/services");
    } finally {
      setLoading(false);
    }
  };

  // Check for booking conflicts (capacity-aware)
  const checkAvailability = async (
    serviceId: string,
    date: Date,
    startHHMM: string,
    endHHMM: string,
    capacity: number
  ) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("service_bookings")
      .select("start_time,end_time")
      .eq("service_id", serviceId)
      .eq("service_date", dateStr)
      .in("status", ["pending", "pending_payment", "confirmed"]);

    if (error) {
      console.error("Error checking availability:", error);
      return false;
    }

    const start = startHHMM;
    const end = endHHMM;

    const overlapCount = (data ?? []).reduce((count, b) => {
      if (!b.start_time || !b.end_time) return count;
      const bs = String(b.start_time).slice(0, 5);
      const be = String(b.end_time).slice(0, 5);
      return bs < end && be > start ? count + 1 : count;
    }, 0);

    return overlapCount < Math.max(capacity, 1);
  };

  const computed = useMemo(() => {
    if (!service) return { total: 0, durationMinutes: 0, hourlyRate: 0, hasDiscount: false };

    const hasDiscount = (service.discount_percentage ?? 0) > 0;
    const baseHourly = Number(service.original_price ?? service.price ?? 0);
    const hourlyRate = hasDiscount
      ? Number((baseHourly * (1 - Number(service.discount_percentage) / 100)).toFixed(2))
      : Number(service.price ?? 0);

    const durationMinutes = selectedSlot
      ? (() => {
          const [sh, sm] = selectedSlot.start.split(":").map((x) => Number(x));
          const [eh, em] = selectedSlot.end.split(":").map((x) => Number(x));
          return eh * 60 + em - (sh * 60 + sm);
        })()
      : 0;

    const total = service.price === 0
      ? 0
      : service.availability_type && selectedSlot
        ? Number((hourlyRate * (durationMinutes / 60)).toFixed(2))
        : Number(service.price ?? 0);

    return { total, durationMinutes, hourlyRate, hasDiscount };
  }, [service, selectedSlot]);

  const handleBooking = async () => {
    if (!service || !user || !selectedDate) return;

    // Require time range if service has availability settings
    if (service.availability_type) {
      if (!selectedSlot?.start || !selectedSlot?.end) {
        toast({
          title: t("serviceBooking.selectTimeRequired"),
          description: t("serviceBooking.selectTimeRequiredDesc"),
          variant: "destructive",
        });
        return;
      }

      if (selectedSlot.end <= selectedSlot.start) {
        toast({
          title: t("serviceBooking.invalidTimeRange"),
          description: t("serviceBooking.invalidTimeRangeDesc"),
          variant: "destructive",
        });
        return;
      }
    }

    setBookingLoading(true);
    try {
      // Capacity-aware availability check (mirrors DB trigger)
      if (service.availability_type && selectedSlot) {
        const capacity = Number(service.max_capacity ?? 1);
        const ok = await checkAvailability(
          service.id,
          selectedDate,
          selectedSlot.start,
          selectedSlot.end,
          capacity
        );

        if (!ok) {
          toast({
            title: t("serviceBooking.slotTaken"),
            description: t("serviceBooking.slotTakenDesc"),
            variant: "destructive",
          });
          setBookingLoading(false);
          return;
        }
      }

      const bookingReference = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const serviceDateStr = format(selectedDate, "yyyy-MM-dd");

      const bookingData: any = {
        service_id: service.id,
        user_id: user.id,
        provider_id: service.provider_id,
        booking_date: new Date().toISOString(),
        service_date: serviceDateStr,
        total_amount: computed.total,
        special_requests: specialRequests,
        status: computed.total === 0 ? "confirmed" : "pending_payment",
        booking_reference: bookingReference,
      };

      if (service.availability_type && selectedSlot) {
        bookingData.start_time = `${selectedSlot.start}:00`;
        bookingData.end_time = `${selectedSlot.end}:00`;
      }

      const { data: booking, error: bookingError } = await supabase
        .from("service_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      const newBookingId = booking.id;

      // Send notification to provider about new booking (non-blocking)
      try {
        const timeInfo = selectedSlot
          ? ` ${t("serviceBooking.from")} ${formatTime12h(selectedSlot.start)} ${t("serviceBooking.to")} ${formatTime12h(selectedSlot.end)}`
          : "";

        await supabase.from("notifications").insert({
          user_id: service.provider_id,
          type: "service_booking",
          title: isArabic ? "حجز خدمة جديد" : "New Service Booking",
          message: isArabic
            ? `لديك حجز جديد من ${userProfile?.full_name || "عميل"} لخدمة ${service.name_ar || service.name} بتاريخ ${format(selectedDate, "dd/MM/yyyy", { locale: ar })}${timeInfo}`
            : `New booking from ${userProfile?.full_name || "Customer"} for ${service.name || service.name_ar} on ${format(selectedDate, "dd/MM/yyyy")}${timeInfo}`,
          data: {
            booking_id: newBookingId,
            service_id: service.id,
            user_id: user.id,
            booking_date: selectedDate.toISOString(),
            start_time: selectedSlot?.start,
            end_time: selectedSlot?.end,
            status: computed.total === 0 ? "confirmed" : "pending_payment",
            user_info: {
              name: userProfile?.full_name,
              phone: userProfile?.phone,
              avatar: userProfile?.avatar_url,
            },
          },
        });
      } catch (notificationError) {
        console.error("Notification error (non-blocking):", notificationError);
      }

      if (computed.total === 0) {
        toast({
          title: t("serviceBooking.bookingSuccess"),
          description: t("serviceBooking.freeBookingSuccess"),
        });
        navigate("/service-checkout/success", {
          state: { serviceBookingId: booking.id, isFree: true },
        });
      } else {
        toast({
          title: t("serviceBooking.redirectingToPayment"),
          description: t("serviceBooking.redirectingToPaymentDesc"),
        });

        setTimeout(() => {
          navigate("/checkout", {
            state: {
              serviceBookingId: booking.id,
              serviceTitle: service.name_ar || service.name,
              servicePrice: computed.total,
              bookingType: "service",
              availableSeats: 1,
            },
          });
        }, 1500);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: t("serviceBooking.bookingError"),
        description:
          typeof error?.message === "string" && error.message.includes("Time slot is fully booked")
            ? t("serviceBooking.slotTakenDesc")
            : t("serviceBooking.bookingErrorDesc"),
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
            <div className="text-xl">{t('common.loading')}</div>
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
            <div className="text-xl text-muted-foreground">{t('serviceBooking.notFound')}</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const serviceName = isArabic ? (service.name_ar || service.name) : (service.name || service.name_ar);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{t('serviceBooking.title')}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Service & Provider Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('serviceBooking.serviceDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {service.image_url && (
                      <img 
                        src={service.image_url} 
                        alt={serviceName}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{serviceName}</h3>
                      <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <DollarSign className="w-5 h-5" />
                        {computed.total === 0 ? t("serviceBooking.free") : `${computed.total} ${t("common.riyal")}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Provider Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("serviceBooking.serviceProvider")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={service.provider?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold truncate">
                        {service.provider?.full_name || t("common.notSpecified")}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {service.provider?.phone ? (
                          <a className="text-primary hover:underline" href={`tel:${service.provider.phone}`}>
                            {service.provider.phone}
                          </a>
                        ) : (
                          <span>{t("common.notSpecified")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Your Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('serviceBooking.yourInfo')}</CardTitle>
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
                  <CardTitle>{t('serviceBooking.bookingDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-2 block">{t('serviceBooking.selectDate')}</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedSlot(null); // Reset slot when date changes
                      }}
                      locale={dateLocale}
                      className="rounded-md border"
                      disabled={(date) => date < new Date()}
                    />
                  </div>

                  {/* Time Selection */}
                  {service.availability_type && (
                    <div>
                      <Label className="mb-2 block">{t("serviceBooking.selectTime")}</Label>
                      <BookingTimeRangeSelector
                        serviceId={service.id}
                        selectedDate={selectedDate}
                        availableFrom={service.available_from || "08:00"}
                        availableTo={service.available_to || "22:00"}
                        maxConcurrent={Number(service.max_capacity ?? 1)}
                        value={selectedSlot}
                        onChange={(range) => {
                          if (!range || !range.start || !range.end) {
                            setSelectedSlot(null);
                            return;
                          }
                          setSelectedSlot(range);
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="requests" className="mb-2 block">
                      {t('serviceBooking.specialRequests')}
                    </Label>
                    <Textarea
                      id="requests"
                      placeholder={t('serviceBooking.specialRequestsPlaceholder')}
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
                  <CardTitle>{t('serviceBooking.bookingSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('serviceBooking.serviceName')}:</span>
                      <span className="font-medium">{serviceName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('serviceBooking.bookingDate')}:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: dateLocale }) : '-'}
                      </span>
                    </div>
                    {selectedSlot?.start && selectedSlot?.end && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("serviceBooking.time")}:</span>
                        <span className="font-medium">
                          {formatTime12h(selectedSlot.start)} - {formatTime12h(selectedSlot.end)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('serviceBooking.bookingStatus')}:</span>
                      <Badge variant={service.price === 0 ? "default" : "secondary"}>
                        {service.price === 0 ? t('serviceBooking.pendingConfirmation') : t('serviceBooking.pendingPayment')}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">{t("serviceBooking.totalAmount")}:</span>
                      <span className="text-2xl font-bold text-primary">
                        {computed.total === 0 ? t("serviceBooking.free") : `${computed.total} ${t("common.riyal")}`}
                      </span>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={!selectedDate || bookingLoading || (service.availability_type && !selectedSlot)}
                      className="w-full"
                      size="lg"
                    >
                      <CreditCard className="w-4 h-4 ml-2" />
                      {bookingLoading 
                        ? t('serviceBooking.processing')
                        : service.price === 0 
                          ? t('serviceBooking.confirmBooking')
                          : t('serviceBooking.proceedToPayment')
                      }
                    </Button>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                      {t('serviceBooking.termsAgreement')}
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