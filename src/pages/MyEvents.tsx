import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Download, Star, MessageCircle, CalendarDays, ChevronRight, Ticket, Timer, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MyEventsPage = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pendingPaymentEvents, setPendingPaymentEvents] = useState<any[]>([]);
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            events (
              id,
              title_ar,
              title,
              description,
              description_ar,
              location_ar,
              location,
              start_date,
              end_date,
              price,
              max_attendees,
              current_attendees,
              image_url,
              organizer_id,
              category_id,
              difficulty_level,
              categories:category_id (name, name_ar)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        
        // Calculate days for multi-day events
        const calculateDays = (start: string, end: string) => {
          const startDate = new Date(start);
          const endDate = new Date(end);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays + 1;
        };

        // Calculate days remaining until event
        const calculateDaysRemaining = (startDate: string) => {
          const eventDate = new Date(startDate);
          const now = new Date();
          if (isPast(eventDate)) return null;
          
          const totalSeconds = Math.floor((eventDate.getTime() - now.getTime()) / 1000);
          const days = differenceInDays(eventDate, now);
          const hours = differenceInHours(eventDate, now) % 24;
          const minutes = differenceInMinutes(eventDate, now) % 60;
          const seconds = totalSeconds % 60;
          
          return { days, hours, minutes, seconds, totalSeconds };
        };

        // Calculate reservation time remaining
        const calculateReservationRemaining = (expiresAt: string | null) => {
          if (!expiresAt) return null;
          const expiryDate = new Date(expiresAt);
          const now = new Date();
          if (isPast(expiryDate)) return { expired: true, minutes: 0 };
          const minutes = differenceInMinutes(expiryDate, now);
          return { expired: false, minutes };
        };

        const mapBooking = (b: any, status: string) => {
          const daysRemaining = calculateDaysRemaining(b.events.start_date);
          const reservationRemaining = calculateReservationRemaining(b.reservation_expires_at);
          
          return {
            id: b.id,
            bookingRef: b.booking_reference,
            title: isRTL ? (b.events.title_ar || b.events.title) : (b.events.title || b.events.title_ar),
            description: isRTL ? (b.events.description_ar || b.events.description) : (b.events.description || b.events.description_ar),
            startDate: b.events.start_date,
            endDate: b.events.end_date,
            formattedDate: format(new Date(b.events.start_date), 'PPP', { locale: dateLocale }),
            formattedTime: format(new Date(b.events.start_date), 'p', { locale: dateLocale }),
            location: isRTL ? (b.events.location_ar || b.events.location) : (b.events.location || b.events.location_ar),
            image: b.events.image_url || '/placeholder.svg',
            attendees: b.events.current_attendees || 0,
            maxAttendees: b.events.max_attendees,
            price: b.events.price,
            totalPaid: b.total_amount,
            quantity: b.quantity,
            status,
            eventId: b.events.id,
            organizerId: b.events.organizer_id,
            category: isRTL ? b.events.categories?.name_ar : b.events.categories?.name,
            difficulty: b.events.difficulty_level,
            journeyDays: calculateDays(b.events.start_date, b.events.end_date),
            createdAt: b.created_at,
            rating: 0,
            reviewed: false,
            daysRemaining,
            reservationRemaining,
            reservationExpiresAt: b.reservation_expires_at
          };
        };

        // Filter events based on booking status and event dates
        // Separate pending_payment bookings into their own category
        const pendingPayment = (bookings || []).filter(b => 
          b.events && 
          b.status === 'pending_payment'
        ).map(b => mapBooking(b, 'pending_payment'));
        
        // Include confirmed/paid bookings as "upcoming" if event hasn't ended
        const upcoming = (bookings || []).filter(b => 
          b.events && 
          new Date(b.events.end_date || b.events.start_date) > now && 
          ['confirmed', 'paid', 'pending'].includes(b.status)
        ).map(b => mapBooking(b, b.status));

        // Events that have ended AND were confirmed/paid are "completed"
        const completed = (bookings || []).filter(b => 
          b.events && 
          new Date(b.events.end_date || b.events.start_date) <= now && 
          ['confirmed', 'paid', 'completed'].includes(b.status)
        ).map(b => mapBooking(b, 'completed'));

        // Cancelled, refunded, and expired bookings
        const cancelled = (bookings || []).filter(b => 
          b.events && 
          ['cancelled', 'refunded', 'expired'].includes(b.status)
        ).map(b => mapBooking(b, b.status));

        setPendingPaymentEvents(pendingPayment);
        setUpcomingEvents(upcoming);
        setCompletedEvents(completed);
        setCancelledEvents(cancelled);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user, isRTL, dateLocale]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-success text-success-foreground">{isRTL ? 'مؤكد' : 'Confirmed'}</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-info text-info-foreground">{isRTL ? 'مدفوع' : 'Paid'}</Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="border-warning text-warning">{isRTL ? 'في انتظار الدفع' : 'Pending Payment'}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{isRTL ? 'مكتمل' : 'Completed'}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{isRTL ? 'ملغي' : 'Cancelled'}</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-brand-orange text-brand-orange">{isRTL ? 'مسترد' : 'Refunded'}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning">{isRTL ? 'قيد الانتظار' : 'Pending'}</Badge>;
      case 'expired':
        return <Badge variant="outline" className="border-gray-500 text-gray-600">{isRTL ? 'منتهي الصلاحية' : 'Expired'}</Badge>;
      default:
        return <Badge variant="outline">{isRTL ? 'غير معروف' : 'Unknown'}</Badge>;
    }
  };

  // Helper to render days/time remaining badge
  const renderTimeRemaining = (event: any) => {
    if (!event.daysRemaining || event.status === 'pending_payment') return null;
    
    const { days, hours, minutes, seconds } = event.daysRemaining;
    if (days === 0 && hours === 0 && minutes === 0) return null;
    
    // If more than 1 day remaining, show only days
    if (days >= 1) {
      return (
        <Badge variant="secondary" className="bg-info/10 text-info">
          <Timer className="h-3 w-3 mr-1" />
          {days} {isRTL ? (days === 1 ? 'يوم' : 'أيام') : (days === 1 ? 'day' : 'days')}
        </Badge>
      );
    }
    
    // Less than 1 day - show hh:mm:ss countdown
    const formatNum = (n: number) => n.toString().padStart(2, '0');
    return (
      <Badge variant="secondary" className="bg-brand-orange/10 text-brand-orange font-mono">
        <Timer className="h-3 w-3 mr-1" />
        {formatNum(hours)}:{formatNum(minutes)}:{formatNum(seconds)}
      </Badge>
    );
  };

  // Helper to render reservation countdown for pending_payment
  const renderReservationCountdown = (event: any) => {
    if (event.status !== 'pending_payment' || !event.reservationRemaining) return null;
    
    const { expired, minutes } = event.reservationRemaining;
    
    if (expired) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {isRTL ? 'انتهت مهلة الحجز' : 'Reservation Expired'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="border-warning text-warning bg-warning/10">
        <Timer className="h-3 w-3 mr-1" />
        {minutes} {isRTL ? 'دقيقة متبقية للدفع' : 'min left to pay'}
      </Badge>
    );
  };

  // Helper to get status badge color and text for thumbnail overlay
  const getStatusBadgeForThumbnail = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return { bg: 'bg-success', text: isRTL ? 'مدفوع' : 'Paid' };
      case 'pending_payment':
        return { bg: 'bg-warning', text: isRTL ? 'في انتظار الدفع' : 'Pending Payment' };
      case 'completed':
        return { bg: 'bg-info', text: isRTL ? 'مكتمل' : 'Completed' };
      case 'cancelled':
        return { bg: 'bg-destructive', text: isRTL ? 'ملغي' : 'Cancelled' };
      case 'refunded':
        return { bg: 'bg-brand-orange', text: isRTL ? 'مسترد' : 'Refunded' };
      case 'expired':
        return { bg: 'bg-gray-500', text: isRTL ? 'منتهي' : 'Expired' };
      case 'pending':
        return { bg: 'bg-warning', text: isRTL ? 'قيد الانتظار' : 'Pending' };
      default:
        return { bg: 'bg-gray-500', text: isRTL ? 'غير معروف' : 'Unknown' };
    }
  };

  const EventCard = ({ event, showActions = true }: { event: any; showActions?: boolean }) => {
    const statusBadge = getStatusBadgeForThumbnail(event.status);
    
    return (
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group ${event.status === 'pending_payment' ? 'border-amber-300 dark:border-amber-700' : ''}`} onClick={() => navigate(`/events/${event.eventId}`)}>
      <div className="md:flex" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="md:w-1/3 relative">
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Status badge on thumbnail */}
          <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} ${statusBadge.bg} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}>
            {event.status === 'paid' || event.status === 'confirmed' ? (
              <Ticket className="h-3.5 w-3.5" />
            ) : event.status === 'pending_payment' ? (
              <CreditCard className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {statusBadge.text}
          </div>
          {event.journeyDays > 1 && (
            <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} bg-background/90 backdrop-blur-sm text-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
              <CalendarDays className="h-3.5 w-3.5" />
              {event.journeyDays} {isRTL ? 'أيام' : 'Days'}
            </div>
          )}
          {event.category && (
            <div className={`absolute bottom-3 ${isRTL ? 'right-3' : 'left-3'} bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium`}>
              {event.category}
            </div>
          )}
        </div>
        
        <div className="md:w-2/3 p-6">
          <CardHeader className="p-0 mb-4">
            <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">{event.title}</CardTitle>
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getStatusBadge(event.status)}
                {renderTimeRemaining(event)}
                {renderReservationCountdown(event)}
                {event.difficulty && (
                  <Badge variant="outline" className="text-xs capitalize">{event.difficulty}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 space-y-3">
            {/* Ticket count badge */}
            <div className={`flex items-center flex-wrap gap-2 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{event.bookingRef}</span>
              <Badge variant="secondary" className="gap-1">
                <Ticket className="h-3 w-3" />
                {event.quantity} {isRTL ? (event.quantity > 1 ? 'تذاكر' : 'تذكرة') : (event.quantity > 1 ? 'tickets' : 'ticket')}
              </Badge>
            </div>

            <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{event.formattedDate} • {event.formattedTime}</span>
            </div>
            
            <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            
            <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{event.attendees}/{event.maxAttendees}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-primary">{event.totalPaid} {isRTL ? 'ر.س' : 'SAR'}</span>
                {event.quantity > 1 && (
                  <span className="text-muted-foreground text-xs">({event.quantity} {isRTL ? 'تذاكر' : 'tickets'})</span>
                )}
              </div>
            </div>

            {event.status === 'completed' && (
              <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                {event.reviewed ? (
                  <>
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span>{event.rating}/5</span>
                    <Badge variant="outline" className="text-xs">{isRTL ? 'تم التقييم' : 'Reviewed'}</Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">{isRTL ? 'بانتظار التقييم' : 'Awaiting Review'}</Badge>
                )}
              </div>
            )}
            
            {showActions && (
              <div className={`flex flex-wrap gap-2 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={(e) => e.stopPropagation()}>
                {event.status === 'pending_payment' ? (
                  <>
                    <Button 
                      size="sm" 
                      className="gap-2 bg-amber-600 hover:bg-amber-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/checkout', { 
                          state: { 
                            eventId: event.eventId, 
                            eventTitle: event.title,
                            eventPrice: event.price,
                            bookingId: event.id
                          } 
                        });
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      {isRTL ? 'إكمال الدفع' : 'Complete Payment'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="gap-2"
                      disabled={verifyingPayment === event.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setVerifyingPayment(event.id);
                        try {
                          const { data, error } = await supabase.functions.invoke('verify-payment', {
                            body: {
                              booking_id: event.id,
                              booking_type: 'event'
                            }
                          });
                          
                          if (error) throw error;
                          
                          if (data.status === 'confirmed') {
                            toast({
                              title: isRTL ? 'تم تأكيد الدفع' : 'Payment Confirmed',
                              description: isRTL ? 'تم تأكيد حجزك بنجاح' : 'Your booking has been confirmed'
                            });
                            // Refresh events
                            window.location.reload();
                          } else if (data.status === 'failed') {
                            toast({
                              title: isRTL ? 'فشل الدفع' : 'Payment Failed',
                              description: isRTL ? 'لم نتمكن من تأكيد الدفع' : 'Payment could not be confirmed',
                              variant: 'destructive'
                            });
                          } else {
                            toast({
                              title: isRTL ? 'الدفع قيد المعالجة' : 'Payment Pending',
                              description: isRTL ? 'لا يزال الدفع قيد المعالجة' : 'Payment is still being processed'
                            });
                          }
                        } catch (error) {
                          console.error('Error verifying payment:', error);
                          toast({
                            title: isRTL ? 'خطأ' : 'Error',
                            description: isRTL ? 'حدث خطأ أثناء التحقق' : 'An error occurred while verifying',
                            variant: 'destructive'
                          });
                        } finally {
                          setVerifyingPayment(null);
                        }
                      }}
                    >
                      {verifyingPayment === event.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {isRTL ? 'تحقق من الدفع' : 'Verify Payment'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                      {isRTL ? 'إلغاء الحجز' : 'Cancel'}
                    </Button>
                  </>
                ) : event.status === 'confirmed' ? (
                  <>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      {isRTL ? 'تحميل التذكرة' : 'Download Ticket'}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {isRTL ? 'مجموعة الحدث' : 'Event Group'}
                    </Button>
                    <Button size="sm" variant="destructive">
                      {isRTL ? 'إلغاء الحجز' : 'Cancel'}
                    </Button>
                  </>
                ) : event.status === 'completed' && !event.reviewed ? (
                  <Button size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    {isRTL ? 'قيّم الفعالية' : 'Rate Event'}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="gap-1 ms-auto">
                  {isRTL ? 'تفاصيل' : 'Details'}
                  <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
    );
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold mb-2">{isRTL ? 'فعالياتي' : 'My Events'}</h1>
            <p className="text-muted-foreground">
              {isRTL ? 'إدارة الفعاليات التي سجلت فيها' : 'Manage events you have registered for'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              {pendingPaymentEvents.length > 0 && (
                <TabsTrigger value="pending_payment" className="text-amber-600">
                  {isRTL ? 'في انتظار الدفع' : 'Pending Payment'} ({pendingPaymentEvents.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="upcoming">{isRTL ? 'القادمة' : 'Upcoming'} ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="completed">{isRTL ? 'المكتملة' : 'Completed'} ({completedEvents.length})</TabsTrigger>
              <TabsTrigger value="cancelled">{isRTL ? 'الملغية' : 'Cancelled'} ({cancelledEvents.length})</TabsTrigger>
            </TabsList>

            {/* Pending Payment Tab */}
            {pendingPaymentEvents.length > 0 && (
              <TabsContent value="pending_payment" className="space-y-6 mt-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      {isRTL 
                        ? 'هذه الحجوزات محفوظة لمدة 15 دقيقة فقط. أكمل الدفع لتأكيد حجزك.' 
                        : 'These reservations are held for 15 minutes only. Complete payment to confirm your booking.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {pendingPaymentEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </TabsContent>
            )}

            <TabsContent value="upcoming" className="space-y-6 mt-6">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد فعاليات قادمة' : 'No upcoming events'}</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {isRTL ? 'لم تسجل في أي فعالية قادمة بعد' : "You haven't registered for any upcoming events yet"}
                    </p>
                    <Button onClick={() => navigate('/groups')}>
                      {isRTL ? 'اذهب الى قائمة المجموعات' : 'Browse Groups'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-6 mt-6">
              {completedEvents.length > 0 ? (
                <div className="space-y-4">
                  {completedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد فعاليات مكتملة' : 'No completed events'}</h3>
                    <p className="text-muted-foreground text-center">
                      {isRTL ? 'لم تكمل أي فعالية بعد' : "You haven't completed any events yet"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-6 mt-6">
              {cancelledEvents.length > 0 ? (
                <div className="space-y-4">
                  {cancelledEvents.map((event) => (
                    <EventCard key={event.id} event={event} showActions={false} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{isRTL ? 'لا توجد فعاليات ملغية' : 'No cancelled events'}</h3>
                    <p className="text-muted-foreground text-center">
                      {isRTL ? 'لم تلغ أي فعالية' : "You haven't cancelled any events"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyEventsPage;