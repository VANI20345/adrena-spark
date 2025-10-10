import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { eventsService, ratingsService } from "@/services/supabaseServices";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface RatingData {
  averageRating: number;
  totalReviews: number;
}

const RecentEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [eventRatings, setEventRatings] = useState<Record<string, RatingData>>({});
  const [loading, setLoading] = useState(true);
  const { t } = useLanguageContext();

  useEffect(() => {
    const fetchRecentEvents = async () => {
      try {
        const { data, error } = await eventsService.getAll();
        if (error) throw error;
        
        // Get recently added events (limited to 8) - only showing available events
        const availableEvents = data?.filter(event => {
          const hasAvailableSeats = !event.max_attendees || 
            (event.current_attendees || 0) < event.max_attendees;
          const isFutureEvent = new Date(event.start_date) > new Date();
          return hasAvailableSeats && isFutureEvent;
        }) || [];
        
        // Sort by created_at DESC and take first 8
        const recentEvents = availableEvents
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8);
        
        setEvents(recentEvents);

        // Fetch ratings for each event
        if (recentEvents.length > 0) {
          const ratingsPromises = recentEvents.map(async (event) => {
            try {
              const { data: ratingData } = await ratingsService.getByEntity(event.id, 'event');
              return {
                eventId: event.id,
                rating: ratingData ? {
                  averageRating: ratingData.average_rating,
                  totalReviews: ratingData.total_reviews
                } : { averageRating: 0, totalReviews: 0 }
              };
            } catch (error) {
              console.error(`Error fetching rating for event ${event.id}:`, error);
              return {
                eventId: event.id,
                rating: { averageRating: 0, totalReviews: 0 }
              };
            }
          });

          const ratings = await Promise.all(ratingsPromises);
          const ratingsMap = ratings.reduce((acc, { eventId, rating }) => {
            acc[eventId] = rating;
            return acc;
          }, {} as Record<string, RatingData>);
          
          setEventRatings(ratingsMap);
        }
      } catch (error) {
        console.error('Error fetching recent events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentEvents();
  }, []);

  const getRatingDisplay = (eventId: string) => {
    const rating = eventRatings[eventId];
    if (!rating || rating.totalReviews === 0) {
      return (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">لا توجد تقييمات</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm">
          {rating.averageRating.toFixed(1)} ({rating.totalReviews})
        </span>
      </div>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "سهل": case "easy": return "bg-green-100 text-green-800";
      case "متوسط": case "medium": return "bg-yellow-100 text-yellow-800";
      case "صعب": case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('home.recentEvents', 'الفعاليات المضافة حديثاً')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.recentEventsDescription', 'اكتشف أحدث المغامرات التي تم إضافتها')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 h-48 rounded-t-lg"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('home.recentEvents', 'الفعاليات المضافة حديثاً')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.recentEventsDescription', 'اكتشف أحدث المغامرات التي تم إضافتها')}
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
            slidesToScroll: 1,
            skipSnaps: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {events.map((event) => (
              <CarouselItem key={event.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow h-full">
                  <div className="relative">
                    <img 
                      src={event.image_url || ''} 
                      alt={event.title}
                      className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const fallback = target.nextElementSibling as HTMLElement;
                        target.style.display = 'none';
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/30 hidden items-center justify-center">
                      <div className="text-center">
                        <Calendar className="w-12 h-12 text-primary/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لا توجد صورة</p>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      {event.difficulty_level && (
                        <Badge className={getDifficultyColor(event.difficulty_level)}>
                          {event.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-primary">
                          {event.price > 0 ? `${event.price} ريال` : 'مجاني'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary smooth-transition line-clamp-2">
                        {event.title_ar || event.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.location_ar || event.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(event.start_date).toLocaleDateString('ar-SA')}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {event.current_attendees || 0}/{event.max_attendees || '∞'}
                        </div>
                        {getRatingDisplay(event.id)}
                      </div>
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
            <Link to="/explore">
              عرض جميع الفعاليات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentEvents;
