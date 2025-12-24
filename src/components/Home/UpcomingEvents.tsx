import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";

const UpcomingEvents = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const { user } = useAuth();
  const { language } = useLanguageContext();

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get groups user is member of
        const { data: memberGroups, error: groupsError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (groupsError) throw groupsError;

        if (!memberGroups || memberGroups.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const groupIds = memberGroups.map(g => g.group_id);

        // Get upcoming events from these groups
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            id,
            title,
            title_ar,
            location,
            location_ar,
            start_date,
            end_date,
            price,
            image_url,
            difficulty_level,
            current_attendees,
            max_attendees,
            group_id
          `)
          .in('group_id', groupIds)
          .gte('start_date', new Date().toISOString())
          .eq('status', 'approved')
          .order('start_date', { ascending: true })
          .limit(8);

        if (eventsError) throw eventsError;

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
              الفعاليات القادمة
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              الفعاليات القادمة من القروبات المنضم لها
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-t-lg"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
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
              الفعاليات القادمة
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              الفعاليات القادمة من القروبات المنضم لها
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">لا توجد فعاليات قادمة في القروبات المنضم لها</p>
            <Button asChild variant="outline">
              <Link to="/groups">تصفح القروبات</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            الفعاليات القادمة
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            أقرب الفعاليات المتاحة للحجز
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {events.map((event) => (
              <CarouselItem key={event.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full">
                  <div className="relative">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={language === 'ar' ? event.title_ar : event.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    {event.difficulty_level && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="secondary">
                          {event.difficulty_level === 'beginner' ? 'مبتدئ' : 
                           event.difficulty_level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-primary">
                          {event.price ? `${event.price} ريال` : 'مجاني'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {language === 'ar' ? event.title_ar : event.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{language === 'ar' ? event.location_ar : event.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(event.start_date).toLocaleDateString('ar-SA')}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {new Date(event.start_date).toLocaleTimeString('ar-SA', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>

                      {event.max_attendees && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {event.current_attendees || 0}/{event.max_attendees}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/event/${event.id}`}>
                        عرض التفاصيل
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        <div className="text-center mt-8">
          <Button asChild size="lg" variant="outline">
            <Link to="/my-events">
              عرض فعالياتي الخاصة
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default UpcomingEvents;
