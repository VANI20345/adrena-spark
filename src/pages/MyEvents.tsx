import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Download, Star, MessageCircle, CalendarDays, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const MyEventsPage = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        const mapBooking = (b: any, status: string) => ({
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
          reviewed: false
        });

        const upcoming = (bookings || []).filter(b => 
          b.events && new Date(b.events.start_date) > now && b.status === 'confirmed'
        ).map(b => mapBooking(b, 'confirmed'));

        const completed = (bookings || []).filter(b => 
          b.events && new Date(b.events.start_date) <= now && b.status !== 'cancelled'
        ).map(b => mapBooking(b, 'completed'));

        const cancelled = (bookings || []).filter(b => 
          b.events && b.status === 'cancelled'
        ).map(b => mapBooking(b, 'cancelled'));

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
        return <Badge variant="default" className="bg-green-600">{isRTL ? 'مؤكد' : 'Confirmed'}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{isRTL ? 'مكتمل' : 'Completed'}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{isRTL ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{isRTL ? 'غير معروف' : 'Unknown'}</Badge>;
    }
  };

  const EventCard = ({ event, showActions = true }: { event: any; showActions?: boolean }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/events/${event.eventId}`)}>
      <div className="md:flex" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="md:w-1/3 relative">
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {event.journeyDays > 1 && (
            <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {event.journeyDays} {isRTL ? 'أيام' : 'Days'}
            </div>
          )}
          {event.category && (
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
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
                {event.difficulty && (
                  <Badge variant="outline" className="text-xs capitalize">{event.difficulty}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 space-y-3">
            <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{event.bookingRef}</span>
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
                {event.status === 'confirmed' ? (
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">{isRTL ? 'القادمة' : 'Upcoming'} ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="completed">{isRTL ? 'المكتملة' : 'Completed'} ({completedEvents.length})</TabsTrigger>
              <TabsTrigger value="cancelled">{isRTL ? 'الملغية' : 'Cancelled'} ({cancelledEvents.length})</TabsTrigger>
            </TabsList>

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