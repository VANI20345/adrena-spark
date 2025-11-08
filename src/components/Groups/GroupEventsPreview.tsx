import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadEvents();
  }, [groupId]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      // Get event_id and check ownership
      const { data: groupData } = await supabase
        .from('event_groups')
        .select('event_id, created_by')
        .eq('id', groupId)
        .single();

      // Check if current user is the group owner
      if (user && groupData) {
        setIsOwner(groupData.created_by === user.id);
      }

      if (!groupData?.event_id) {
        setEvents([]);
        return;
      }

      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', groupData.event_id)
        .eq('status', 'approved')
        .single();

      if (eventData) {
        const now = new Date();
        const startDate = new Date(eventData.start_date);
        const endDate = new Date(eventData.end_date);

        let status: 'active' | 'expired' | 'upcoming' = 'upcoming';
        if (now >= startDate && now <= endDate) {
          status = 'active';
        } else if (now > endDate) {
          status = 'expired';
        }

        setEvents([{ ...eventData, status }]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeEvents = () => {
    return {
      active: events.filter(e => e.status === 'active'),
      upcoming: events.filter(e => e.status === 'upcoming'),
      expired: events.filter(e => e.status === 'expired')
    };
  };

  const EventCard = ({ event, compact = false }: { event: Event; compact?: boolean }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className={compact ? 'flex' : 'flex flex-col'}>
        {event.image_url && (
          <div className={compact ? 'w-24 h-24 shrink-0' : 'h-32 w-full'}>
            <img
              src={event.image_url}
              alt={isRTL ? event.title_ar : event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} line-clamp-1`}>
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
              {event.status === 'expired' && (isRTL ? 'منتهي' : 'Expired')}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span className="line-clamp-1">
                {format(new Date(event.start_date), 'PPP', { locale: isRTL ? ar : undefined })}
              </span>
            </div>
            {!compact && (
              <>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{isRTL ? event.location_ar : event.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{event.current_attendees} / {event.max_attendees}</span>
                </div>
              </>
            )}
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

  const categorized = categorizeEvents();
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
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/groups/create-event?groupId=${groupId}`)}
                >
                  {isRTL ? 'إنشاء فعالية' : 'Create Event'}
                </Button>
              )}
              {events.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllDialog(true)}
                  className="text-primary"
                >
                  {isRTL ? 'عرض الكل' : 'View All'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-1' : 'ml-1'}`} />
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
            <div className="grid gap-4 md:grid-cols-3">
              {previewEvents.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View All Dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {isRTL ? 'جميع الفعاليات' : 'All Events'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                {isRTL ? 'الكل' : 'All'} ({events.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                {isRTL ? 'النشطة' : 'Active'} ({categorized.active.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                {isRTL ? 'القادمة' : 'Upcoming'} ({categorized.upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                {isRTL ? 'المنتهية' : 'Expired'} ({categorized.expired.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-4">
              {events.map(event => <EventCard key={event.id} event={event} />)}
            </TabsContent>
            <TabsContent value="active" className="mt-6 space-y-4">
              {categorized.active.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات نشطة' : 'No active events'}
                </div>
              ) : (
                categorized.active.map(event => <EventCard key={event.id} event={event} />)
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {categorized.upcoming.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات قادمة' : 'No upcoming events'}
                </div>
              ) : (
                categorized.upcoming.map(event => <EventCard key={event.id} event={event} />)
              )}
            </TabsContent>
            <TabsContent value="expired" className="mt-6 space-y-4">
              {categorized.expired.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {isRTL ? 'لا توجد فعاليات منتهية' : 'No expired events'}
                </div>
              ) : (
                categorized.expired.map(event => <EventCard key={event.id} event={event} />)
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
