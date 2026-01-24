import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  MapPin, 
  Download,
  Share2,
  Loader2,
  Ticket,
  Clock,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TicketData {
  id: string;
  booking_reference: string;
  status: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  events: {
    id: string;
    title: string;
    title_ar: string;
    start_date: string;
    end_date: string;
    location: string;
    location_ar: string;
    image_url: string | null;
  } | null;
}

const Tickets = () => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { user } = useAuth();

  // Fetch user's bookings as tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['user-event-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          status,
          quantity,
          total_amount,
          created_at,
          events:event_id (
            id,
            title,
            title_ar,
            start_date,
            end_date,
            location,
            location_ar,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TicketData[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Categorize tickets
  const upcomingTickets = tickets.filter(t => t.events?.start_date && isFuture(new Date(t.events.start_date)));
  const todayTickets = tickets.filter(t => t.events?.start_date && isToday(new Date(t.events.start_date)));
  const pastTickets = tickets.filter(t => t.events?.end_date && isPast(new Date(t.events.end_date)));

  const getStatusBadge = (status: string, eventDate?: string) => {
    const eventDateTime = eventDate ? new Date(eventDate) : null;
    const isEventPast = eventDateTime && isPast(eventDateTime);
    
    if (isEventPast) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {isRTL ? 'تم الحضور' : 'Attended'}
        </Badge>
      );
    }
    
    if (eventDateTime && isToday(eventDateTime)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
          <Clock className="w-3 h-3 mr-1" />
          {isRTL ? 'اليوم' : 'Today'}
        </Badge>
      );
    }
    
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CalendarCheck className="w-3 h-3 mr-1" />
            {isRTL ? 'مؤكد' : 'Confirmed'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            {isRTL ? 'قيد الانتظار' : 'Pending'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{isRTL ? 'غير معروف' : 'Unknown'}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isRTL ? ar : undefined });
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'p', { locale: isRTL ? ar : undefined });
  };

  const TicketCard = ({ ticket }: { ticket: TicketData }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-3 gap-0">
          {/* Event Image */}
          <div className="relative h-48 md:h-full md:min-h-[200px]">
            {ticket.events?.image_url ? (
              <img 
                src={ticket.events.image_url} 
                alt={isRTL ? ticket.events?.title_ar : ticket.events?.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Ticket className="w-12 h-12 text-primary/40" />
              </div>
            )}
            <div className="absolute top-3 right-3">
              {getStatusBadge(ticket.status, ticket.events?.start_date)}
            </div>
          </div>

          {/* Ticket Info */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 line-clamp-2">
                {isRTL ? ticket.events?.title_ar : ticket.events?.title}
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                {ticket.events?.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{formatDate(ticket.events.start_date)}</span>
                    <span className="text-primary font-medium">{formatTime(ticket.events.start_date)}</span>
                  </div>
                )}
                {ticket.events?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="line-clamp-1">{isRTL ? ticket.events?.location_ar : ticket.events?.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{isRTL ? 'رقم الحجز' : 'Booking Ref'}</p>
                  <p className="font-mono font-bold text-primary">{ticket.booking_reference}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{isRTL ? 'عدد التذاكر' : 'Tickets'}</p>
                  <p className="font-bold">{ticket.quantity} {isRTL ? 'تذكرة' : 'ticket(s)'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" className="flex-1">
                <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'تحميل' : 'Download'}
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <Share2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'مشاركة' : 'Share'}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="border-t md:border-t-0 md:border-l border-dashed bg-muted/30 p-6 flex flex-col items-center justify-center">
            <div className="w-36 h-36 bg-white rounded-xl p-3 shadow-inner border-2 border-dashed border-primary/20">
              <QRCodeSVG 
                value={ticket.booking_reference} 
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-4 max-w-[140px]">
              {isRTL ? 'أظهر هذا الكود عند الدخول للفعالية' : 'Show this code at event entry'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">{isRTL ? 'تذاكر الفعاليات' : 'Event Tickets'}</h1>
            </div>
            <p className="text-muted-foreground">
              {isRTL ? 'إدارة تذاكرك للفعاليات المسجلة' : 'Manage your registered event tickets'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{upcomingTickets.length}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'قادمة' : 'Upcoming'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold">{todayTickets.length}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'اليوم' : 'Today'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{pastTickets.length}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'سابقة' : 'Past'}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="upcoming" className="gap-2">
                <CalendarCheck className="w-4 h-4" />
                {isRTL ? 'القادمة' : 'Upcoming'}
                {upcomingTickets.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{upcomingTickets.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="today" className="gap-2">
                <Clock className="w-4 h-4" />
                {isRTL ? 'اليوم' : 'Today'}
                {todayTickets.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{todayTickets.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isRTL ? 'السابقة' : 'Past'}
                {pastTickets.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pastTickets.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Tickets */}
            <TabsContent value="upcoming" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : upcomingTickets.length === 0 ? (
                <EmptyState 
                  icon={CalendarCheck}
                  title={isRTL ? 'لا توجد تذاكر قادمة' : 'No upcoming tickets'}
                  description={isRTL ? 'احجز فعالية للحصول على تذكرتك' : 'Book an event to get your ticket'}
                />
              ) : (
                <div className="grid gap-6">
                  {upcomingTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Today's Tickets */}
            <TabsContent value="today" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : todayTickets.length === 0 ? (
                <EmptyState 
                  icon={Clock}
                  title={isRTL ? 'لا توجد فعاليات اليوم' : 'No events today'}
                  description={isRTL ? 'ليس لديك فعاليات مجدولة لهذا اليوم' : 'You have no events scheduled for today'}
                />
              ) : (
                <div className="grid gap-6">
                  {todayTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Past Tickets */}
            <TabsContent value="past" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : pastTickets.length === 0 ? (
                <EmptyState 
                  icon={CheckCircle2}
                  title={isRTL ? 'لا توجد تذاكر سابقة' : 'No past tickets'}
                  description={isRTL ? 'ستظهر الفعاليات المنتهية هنا' : 'Completed events will appear here'}
                />
              ) : (
                <div className="grid gap-6">
                  {pastTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Tickets;
