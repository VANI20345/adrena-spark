import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Bookmark, BookmarkCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  title_ar: string;
  location: string;
  location_ar: string;
  start_date: string;
  end_date: string;
  current_attendees: number;
  max_attendees: number;
  image_url: string;
  status: string;
  is_bookmarked: boolean;
}

interface GroupEventsProps {
  groupId: string;
}

export const GroupEvents: React.FC<GroupEventsProps> = ({ groupId }) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isOwner, setIsOwner] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadEvents();
  }, [groupId, user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Check if user is the group owner
      const { data: groupData, error: groupError } = await supabase
        .from('event_groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setIsOwner(groupData?.created_by === user.id);

      // Load all events associated with this group
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('group_id', groupId)
        .in('status', ['approved', 'active'])
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Check bookmarks for all events
      const eventsWithBookmarks = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: bookmarkData } = await supabase
            .from('event_bookmarks')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...event,
            is_bookmarked: !!bookmarkData
          };
        })
      );

      setEvents(eventsWithBookmarks);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل تحميل الفعاليات' : 'Failed to load events',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = async (eventId: string, isBookmarked: boolean) => {
    if (!user) return;

    try {
      if (isBookmarked) {
        await supabase
          .from('event_bookmarks')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('event_bookmarks')
          .insert({ event_id: eventId, user_id: user.id });
      }
      loadEvents();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const filterEvents = (events: Event[]) => {
    const now = new Date();
    if (selectedTab === 'all') return events;
    if (selectedTab === 'upcoming') {
      return events.filter(e => new Date(e.start_date) > now);
    }
    if (selectedTab === 'past') {
      return events.filter(e => new Date(e.end_date) < now);
    }
    return events;
  };

  const filteredEvents = filterEvents(events);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
            <TabsTrigger value="upcoming">{isRTL ? 'القادمة' : 'Upcoming'}</TabsTrigger>
            <TabsTrigger value="past">{isRTL ? 'السابقة' : 'Past'}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Only show Create Event button to group owner */}
        {isOwner && (
          <Button onClick={() => navigate(`/groups/create-event?groupId=${groupId}`)}>
            {isRTL ? 'إنشاء فعالية' : 'Create Event'}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {isRTL ? 'لا توجد فعاليات' : 'No events'}
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => {
            const isPast = new Date(event.end_date) < new Date();
            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Event Image */}
                  {event.image_url && (
                    <div className="md:w-48 h-48 md:h-auto">
                      <img
                        src={event.image_url}
                        alt={isRTL ? event.title_ar : event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Event Details */}
                  <CardContent className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          {isRTL ? event.title_ar : event.title}
                        </h3>
                        {isPast && (
                          <Badge variant="secondary">{isRTL ? 'منتهية' : 'Past'}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBookmark(event.id, event.is_bookmarked)}
                      >
                        {event.is_bookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-primary" />
                        ) : (
                          <Bookmark className="w-5 h-5" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{isRTL ? event.location_ar : event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(event.start_date), 'PPP', {
                            locale: isRTL ? ar : undefined
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.current_attendees} / {event.max_attendees}{' '}
                          {isRTL ? 'مشارك' : 'participants'}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="w-full md:w-auto"
                    >
                      {isRTL ? 'عرض التفاصيل' : 'View Details'}
                    </Button>
                  </CardContent>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
