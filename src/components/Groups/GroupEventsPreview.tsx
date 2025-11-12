import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

interface GroupEventsPreviewProps {
  groupId: string;
}

export const GroupEventsPreview: React.FC<GroupEventsPreviewProps> = ({ groupId }) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadEvents();
  }, [groupId]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      // Check group ownership
      const { data: groupData } = await supabase
        .from('event_groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      // Check if current user is the group owner
      if (user && groupData) {
        setIsOwner(groupData.created_by === user.id);
      }

      // Load all events for this group
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
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const EventCard = ({ event }: { event: Event }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        <div className="w-24 h-24 shrink-0">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800'}
            alt={isRTL ? event.title_ar : event.title}
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-sm line-clamp-1">
              {isRTL ? event.title_ar : event.title}
            </h4>
            <Badge
              variant={
                event.status === 'active' ? 'default' :
                event.status === 'upcoming' ? 'secondary' : 'outline'
              }
              className="text-xs shrink-0"
            >
              {event.status === 'active' && (isRTL ? 'نشط' : 'Active')}
              {event.status === 'upcoming' && (isRTL ? 'قريباً' : 'Upcoming')}
              {event.status === 'expired' && (isRTL ? 'منتهي' : 'Passed')}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span className="line-clamp-1">
                {format(new Date(event.start_date), 'PPP', { locale: isRTL ? ar : undefined })}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/event/${event.id}`)}
          >
            {isRTL ? 'عرض التفاصيل' : 'View Details'}
          </Button>
        </CardContent>
      </div>
    </Card>
  );

  const previewEvents = events.slice(0, 3);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isRTL ? 'الفعاليات' : 'Events'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/groups/${groupId}/events`)}
                className="text-primary"
              >
                {isRTL ? 'عرض الكل' : 'View All'}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-1' : 'ml-1'}`} />
              </Button>
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/groups/create-event?groupId=${groupId}`)}
                >
                  {isRTL ? 'إنشاء فعالية' : 'Create Event'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : previewEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {isRTL ? 'لا توجد فعاليات' : 'No events'}
            </div>
          ) : (
            <div className="space-y-3">
              {previewEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
};
