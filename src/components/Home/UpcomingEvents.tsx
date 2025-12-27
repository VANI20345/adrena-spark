import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  title_ar: string;
  location: string;
  location_ar: string;
  start_date: string;
  end_date: string;
  price: number | null;
  image_url: string | null;
  difficulty_level: string | null;
  current_attendees: number | null;
  max_attendees: number | null;
  group_id: string | null;
}

const UpcomingEvents = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    direction: isRTL ? 'rtl' : 'ltr',
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: memberGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (!memberGroups || memberGroups.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const groupIds = memberGroups.map(g => g.group_id);

        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, title_ar, location, location_ar, start_date, end_date, price, image_url, difficulty_level, current_attendees, max_attendees, group_id')
          .in('group_id', groupIds)
          .gte('start_date', new Date().toISOString())
          .eq('status', 'approved')
          .order('start_date', { ascending: true });

        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [user]);

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? 'الفعاليات القادمة' : 'Upcoming Events'}
            </h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[380px] w-[300px] flex-shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? 'الفعاليات القادمة' : 'Upcoming Events'}
            </h2>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لا توجد فعاليات قادمة' : 'No upcoming events'}
            </p>
            <Button asChild variant="outline">
              <Link to="/groups">{isRTL ? 'تصفح القروبات' : 'Browse Groups'}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {isRTL ? 'الفعاليات القادمة' : 'Upcoming Events'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {isRTL ? `${events.length} فعالية قادمة` : `${events.length} upcoming events`}
          </p>
        </div>

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-4" style={{ touchAction: 'pan-y pinch-zoom' }}>
            {events.map((event) => (
              <div key={event.id} className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px]">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <div className="relative">
                    {event.image_url ? (
                      <img src={event.image_url} alt={isRTL ? event.title_ar : event.title} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    {event.difficulty_level && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary">
                          {event.difficulty_level === 'beginner' ? (isRTL ? 'مبتدئ' : 'Beginner') : event.difficulty_level === 'intermediate' ? (isRTL ? 'متوسط' : 'Intermediate') : (isRTL ? 'متقدم' : 'Advanced')}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-primary">
                          {event.price ? (isRTL ? `${event.price} ريال` : `${event.price} SAR`) : (isRTL ? 'مجاني' : 'Free')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {isRTL ? event.title_ar : event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{isRTL ? event.location_ar : event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(event.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(event.start_date).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      {event.max_attendees && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>{event.current_attendees || 0}/{event.max_attendees}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pb-4 pt-0">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/event/${event.id}`}>{isRTL ? 'عرض التفاصيل' : 'View Details'}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons - Below Carousel */}
        {events.length > 1 && (
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={scrollPrev} disabled={!canScrollPrev}>
              <ChevronLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={scrollNext} disabled={!canScrollNext}>
              <ChevronRight className={cn("h-5 w-5", isRTL && "rotate-180")} />
            </Button>
          </div>
        )}

        <div className="text-center mt-8">
          <Button asChild size="lg" variant="outline">
            <Link to="/my-events">{isRTL ? 'عرض فعالياتي الخاصة' : 'View My Events'}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default UpcomingEvents;