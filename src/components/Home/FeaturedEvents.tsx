import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { eventsService, ratingsService } from "@/services/supabaseServices";
import { useLanguageContext } from "@/contexts/LanguageContext";

interface RatingData {
  averageRating: number;
  totalReviews: number;
}

const FeaturedEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [eventRatings, setEventRatings] = useState<Record<string, RatingData>>({});
  const [loading, setLoading] = useState(true);
  const { t } = useLanguageContext();

  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      try {
        const { data, error } = await eventsService.getAll();
        if (error) throw error;
        
        // Get featured events (limited to 3) - only showing available events
        const availableEvents = data?.filter(event => {
          const hasAvailableSeats = !event.max_attendees || 
            (event.current_attendees || 0) < event.max_attendees;
          const isFutureEvent = new Date(event.start_date) > new Date();
          return hasAvailableSeats && isFutureEvent;
        }) || [];
        
        const featuredEvents = availableEvents.filter(event => event.featured)?.slice(0, 3) || 
                              availableEvents.slice(0, 3);
        setEvents(featuredEvents);

        // Fetch ratings for each event
        if (featuredEvents.length > 0) {
          const ratingsPromises = featuredEvents.map(async (event) => {
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
        console.error('Error fetching featured events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedEvents();
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
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('home.featuredEvents', 'الفعاليات المميزة')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 h-48 rounded-t-lg"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('home.featuredEvents', 'الفعاليات المميزة')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.featuredEventsDescription', 'اكتشف أفضل المغامرات والأنشطة الخارجية المتاحة هذا الأسبوع')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {events.length > 0 ? events.map((event) => (
            <Card key={event.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
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
                  {event.categories && (
                    <Badge variant="secondary" className="bg-white/90">
                      {event.categories.name_ar || event.categories.name}
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-primary">
                      {event.price > 0 ? `${event.price} ريال` : 'مجاني'}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      شامل الضريبة
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary smooth-transition">
                      {event.title_ar || event.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location_ar || event.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.start_date).toLocaleDateString('ar-SA')}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.current_attendees || 0}/{event.max_attendees || 'غير محدود'}
                      </div>
                      {getRatingDisplay(event.id)}
                    </div>

                    {event.profiles && (
                      <p className="text-sm text-muted-foreground">
                        منظم بواسطة: {event.profiles.full_name || 'منظم الفعالية'}
                      </p>
                    )}
                  </div>
              </CardContent>

              <CardFooter className="px-6 pb-6">
                <div className="flex gap-2 w-full">
                  <Button asChild className="flex-1">
                    <Link to={`/event/${event.id}`}>
                      عرض التفاصيل
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link 
                      to="/checkout" 
                      state={{
                        eventId: event.id,
                        eventTitle: event.title_ar || event.title,
                        eventPrice: event.price,
                        availableSeats: (event.max_attendees || 0) - (event.current_attendees || 0)
                      }}
                    >
                      احجز الآن
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                لا توجد فعاليات مميزة حالياً
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
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

export default FeaturedEvents;