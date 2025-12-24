import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Bookmark, BookmarkCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useGroupEvents, useInvalidateGroupQueries } from '@/hooks/useGroupQueries';
import { EventGalleryDialog } from './EventGalleryDialog';

interface GroupEventsProps {
  groupId: string;
}

export const GroupEvents: React.FC<GroupEventsProps> = ({ groupId }) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('all');
  const [isOwner, setIsOwner] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; initialIndex: number } | null>(null);
  const isRTL = language === 'ar';
  const invalidate = useInvalidateGroupQueries();

  useEffect(() => {
    checkOwnership();
  }, [groupId, user]);

  const checkOwnership = async () => {
    if (!user) return;

    const { data: groupData, error } = await supabase
      .from('event_groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (!error && groupData) {
      setIsOwner(groupData.created_by === user.id);
    }
  };

  // Use TanStack Query hook
  const { data: events = [], isLoading } = useGroupEvents(groupId, user?.id, isOwner);

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
      // Invalidate to refetch
      invalidate.invalidateGroupEvents(groupId);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const filterEvents = (events: any[]) => {
    const now = new Date();
    
    if (selectedTab === 'all') return events.filter(e => e.status !== 'pending');
    if (selectedTab === 'upcoming') {
      return events.filter(e => new Date(e.start_date) > now && e.status !== 'pending');
    }
    if (selectedTab === 'past') {
      return events.filter(e => new Date(e.end_date) < now && e.status !== 'pending');
    }
    if (selectedTab === 'pending') {
      return events.filter(e => e.status === 'pending');
    }
    return events;
  };

  const filteredEvents = filterEvents(events);

  // Calculate event counts for each tab
  const now = new Date();
  const eventCounts = {
    all: events.filter(e => e.status !== 'pending').length,
    upcoming: events.filter(e => new Date(e.start_date) > now && e.status !== 'pending').length,
    past: events.filter(e => new Date(e.end_date) < now && e.status !== 'pending').length,
    pending: events.filter(e => e.status === 'pending').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
              <TabsList className={`grid w-full ${isOwner ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="all">
                  {isRTL ? 'الكل' : 'All'} ({eventCounts.all})
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  {isRTL ? 'القادمة' : 'Upcoming'} ({eventCounts.upcoming})
                </TabsTrigger>
                <TabsTrigger value="past">
                  {isRTL ? 'السابقة' : 'Past'} ({eventCounts.past})
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="pending">
                    {isRTL ? 'قيد الموافقة' : 'Pending'} ({eventCounts.pending})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            
            {/* Only show Create Event button to group owner */}
            {isOwner && (
              <Button onClick={() => navigate(`/groups/create-event?groupId=${groupId}`)}>
                {isRTL ? 'إنشاء فعالية' : 'Create Event'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {isRTL ? 'لا توجد فعاليات' : 'No events'}
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map((event) => {
              const isPast = new Date(event.end_date) < new Date();
              const isPending = event.status === 'pending';
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex flex-col">
                     {/* Event Image */}
                    {event.image_url && (
                      <div className="w-full space-y-2">
                        <div className="w-full h-40">
                          <img
                            src={event.image_url}
                            alt={isRTL ? event.title_ar : event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Small gallery photos below thumbnail */}
                        {event.detail_images && event.detail_images.length > 0 && (
                          <div className="flex gap-1.5 px-2 overflow-x-auto pb-1">
                            {event.detail_images.slice(0, 4).map((img: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGallery({ images: event.detail_images!, initialIndex: idx });
                                }}
                                className="w-14 h-14 flex-shrink-0 rounded overflow-hidden hover:ring-2 ring-primary transition-all"
                              >
                                <img
                                  src={img}
                                  alt={`${isRTL ? event.title_ar : event.title} ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                            {event.detail_images.length > 4 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGallery({ images: event.detail_images!, initialIndex: 4 });
                                }}
                                className="w-14 h-14 flex-shrink-0 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                              >
                                +{event.detail_images.length - 4}
                              </button>
                            )}
                          </div>
                        )}
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
                          {isPending && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              {isRTL ? 'قيد الموافقة' : 'Pending'}
                            </Badge>
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

      {selectedGallery && (
        <EventGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.initialIndex}
          onClose={() => setSelectedGallery(null)}
          isRTL={isRTL}
        />
      )}
    </>
  );
};
