import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, Download, Star, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MyEventsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [completedEvents, setCompletedEvents] = useState<any[]>([]);
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
              location_ar,
              location,
              start_date,
              price,
              max_attendees,
              current_attendees,
              image_url,
              organizer_id
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const upcoming = bookings?.filter(b => 
          new Date(b.events.start_date) > now && b.status === 'confirmed'
        ).map(b => ({
          id: b.id,
          title: b.events.title_ar || b.events.title,
          date: new Date(b.events.start_date).toLocaleDateString('ar-SA'),
          time: new Date(b.events.start_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          location: b.events.location_ar || b.events.location,
          image: b.events.image_url || '/placeholder.svg',
          attendees: b.events.current_attendees || 0,
          maxAttendees: b.events.max_attendees,
          price: b.events.price,
          status: 'confirmed',
          eventId: b.events.id,
          organizerId: b.events.organizer_id
        })) || [];

        const completed = bookings?.filter(b => 
          new Date(b.events.start_date) <= now
        ).map(b => ({
          id: b.id,
          title: b.events.title_ar || b.events.title,
          date: new Date(b.events.start_date).toLocaleDateString('ar-SA'),
          time: new Date(b.events.start_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          location: b.events.location_ar || b.events.location,
          image: b.events.image_url || '/placeholder.svg',
          attendees: b.events.current_attendees || 0,
          maxAttendees: b.events.max_attendees,
          price: b.events.price,
          status: 'completed',
          eventId: b.events.id,
          organizerId: b.events.organizer_id,
          rating: 0,
          reviewed: false
        })) || [];

        setUpcomingEvents(upcoming);
        setCompletedEvents(completed);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">مؤكد</Badge>;
      case 'completed':
        return <Badge variant="secondary">مكتمل</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const EventCard = ({ event, showActions = true }: { event: any; showActions?: boolean }) => (
    <Card className="overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/3">
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-48 md:h-full object-cover"
          />
        </div>
        <div className="md:w-2/3 p-6">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
              {getStatusBadge(event.status)}
            </div>
          </CardHeader>
          
          <CardContent className="p-0 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{event.date} - {event.time}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{event.attendees}/{event.maxAttendees} مشارك</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-primary">{event.price} ريال</span>
            </div>

            {event.rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{event.rating}/5</span>
                {event.reviewed && <Badge variant="outline" className="text-xs">تم التقييم</Badge>}
              </div>
            )}
            
            {showActions && (
              <div className="flex gap-2 pt-4">
                {event.status === 'confirmed' ? (
                  <>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      تحميل التذكرة
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      مجموعة الحدث
                    </Button>
                    <Button size="sm" variant="destructive">
                      إلغاء الحجز
                    </Button>
                  </>
                ) : event.status === 'completed' && !event.reviewed && (
                  <Button size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    قيّم الفعالية
                  </Button>
                )}
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">فعالياتي</h1>
            <p className="text-muted-foreground">
              إدارة الفعاليات التي سجلت فيها
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">القادمة ({upcomingEvents.length})</TabsTrigger>
              <TabsTrigger value="completed">المكتملة ({completedEvents.length})</TabsTrigger>
              <TabsTrigger value="cancelled">الملغية (0)</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-6">
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
                    <h3 className="text-lg font-semibold mb-2">لا توجد فعاليات قادمة</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      لم تسجل في أي فعالية قادمة بعد
                    </p>
                    <Button asChild>
                      <a href="/groups">اذهب الى قائمة المجموعات</a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
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
                    <h3 className="text-lg font-semibold mb-2">لا توجد فعاليات مكتملة</h3>
                    <p className="text-muted-foreground text-center">
                      لم تكمل أي فعالية بعد
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد فعاليات ملغية</h3>
                  <p className="text-muted-foreground text-center">
                    لم تلغ أي فعالية
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyEventsPage;