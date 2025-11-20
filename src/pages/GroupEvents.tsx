import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  title: string;
  title_ar: string;
  location: string;
  location_ar: string;
  start_date: string;
  end_date: string;
  image_url: string;
  current_attendees: number;
  max_attendees: number;
  status: 'active' | 'expired' | 'upcoming';
}

interface GroupInfo {
  id: string;
  group_name: string;
  created_by: string;
}

const GroupEvents = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (!groupId || !user) return;
    loadData();
  }, [groupId, user]);

  const loadData = async () => {
    if (!groupId || !user) return;

    try {
      setIsLoading(true);

      // Load group info
      const { data: groupData, error: groupError } = await supabase
        .from('event_groups')
        .select('id, group_name, created_by')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Check membership
      const { data: memberData } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      setIsMember(!!memberData);
      setIsOwner(groupData.created_by === user.id);

      // Only load events if user is a member
      if (memberData || groupData.created_by === user.id) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('group_id', groupId)
          .eq('status', 'approved')
          .order('start_date', { ascending: true });

        if (eventsData) {
          const now = new Date();
          const eventsWithStatus = eventsData.map(eventData => {
            const startDate = new Date(eventData.start_date);
            const endDate = new Date(eventData.end_date);

            let status: 'active' | 'expired' | 'upcoming' = 'upcoming';
            if (now >= startDate && now <= endDate) {
              status = 'active';
            } else if (now > endDate) {
              status = 'expired';
            }

            return { ...eventData, status };
          });

          setEvents(eventsWithStatus);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeEvents = () => {
    const now = new Date();
    return {
      upcoming: events.filter(e => new Date(e.start_date) > now),
      passed: events.filter(e => new Date(e.end_date) < now)
    };
  };

  const EventCard = ({ event }: { event: Event }) => {
    const formatEventDate = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start.toDateString() === end.toDateString()) {
        return format(start, 'PPP', { locale: isRTL ? ar : undefined });
      }
      
      return `${format(start, 'dd', { locale: isRTL ? ar : undefined })} - ${format(end, 'dd MMMM yyyy', { locale: isRTL ? ar : undefined })}`;
    };

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex flex-col">
          <div className="h-48 w-full">
            <img
              src={event.image_url || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800'}
              alt={isRTL ? event.title_ar : event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-semibold text-xl line-clamp-2">
                {isRTL ? event.title_ar : event.title}
              </h3>
              <Badge
                variant={
                  event.status === 'active' ? 'default' :
                  event.status === 'upcoming' ? 'secondary' : 'outline'
                }
                className="shrink-0"
              >
                {event.status === 'active' && (isRTL ? 'نشط' : 'Active')}
                {event.status === 'upcoming' && (isRTL ? 'قريباً' : 'Upcoming')}
                {event.status === 'expired' && (isRTL ? 'منتهي' : 'Passed')}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatEventDate(event.start_date, event.end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{isRTL ? event.location_ar : event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{event.current_attendees} / {event.max_attendees}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate(`/event/${event.id}`)}
            >
              {isRTL ? 'عرض التفاصيل' : 'View Details'}
            </Button>
          </CardContent>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لم يتم العثور على المجموعة' : 'Group not found'}
            </p>
            <Button onClick={() => navigate('/groups')}>
              {isRTL ? 'العودة للمجموعات' : 'Back to Groups'}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isMember && !isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'يجب أن تكون عضواً في المجموعة لرؤية الفعاليات' : 'You must be a member to view events'}
            </p>
            <Button onClick={() => navigate(`/groups/${groupId}`)}>
              {isRTL ? 'العودة للمجموعة' : 'Back to Group'}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const categorized = categorizeEvents();

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/groups/${groupId}`)}
          className="mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'العودة للمجموعة' : 'Back to Group'}
        </Button>

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isRTL ? 'فعاليات المجموعة' : 'Group Events'}
            </h1>
            <p className="text-muted-foreground">
              {group.group_name}
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => navigate(`/groups/create-event?groupId=${groupId}`)}>
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'إنشاء فعالية' : 'Create Event'}
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              {isRTL ? 'الكل' : 'All'} ({events.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              {isRTL ? 'القادمة' : 'Upcoming'} ({categorized.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="passed">
              {isRTL ? 'السابقة' : 'Passed'} ({categorized.passed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? 'لا توجد فعاليات' : 'No events'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            {categorized.upcoming.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? 'لا توجد فعاليات قادمة' : 'No upcoming events'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorized.upcoming.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="passed" className="mt-6">
            {categorized.passed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {isRTL ? 'لا توجد فعاليات سابقة' : 'No passed events'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorized.passed.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default GroupEvents;
