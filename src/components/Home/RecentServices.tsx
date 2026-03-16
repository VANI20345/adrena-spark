import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ratingsService } from "@/services/supabaseServices";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface RatingData {
  averageRating: number;
  totalReviews: number;
}

const RecentServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [serviceRatings, setServiceRatings] = useState<Record<string, RatingData>>({});
  const [loading, setLoading] = useState(true);
  const { t } = useLanguageContext();

  useEffect(() => {
    const fetchRecentServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select(`
            *,
            service_categories!services_category_id_fkey(name, name_ar),
            profiles!provider_id(full_name)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;
        
        setServices(data || []);

        // Fetch ratings for each service
        if (data && data.length > 0) {
          const ratingsPromises = data.map(async (service) => {
            try {
              const { data: ratingData } = await ratingsService.getByEntity(service.id, 'service');
              return {
                serviceId: service.id,
                rating: ratingData ? {
                  averageRating: ratingData.average_rating,
                  totalReviews: ratingData.total_reviews
                } : { averageRating: 0, totalReviews: 0 }
              };
            } catch (error) {
              console.error(`Error fetching rating for service ${service.id}:`, error);
              return {
                serviceId: service.id,
                rating: { averageRating: 0, totalReviews: 0 }
              };
            }
          });

          const ratings = await Promise.all(ratingsPromises);
          const ratingsMap = ratings.reduce((acc, { serviceId, rating }) => {
            acc[serviceId] = rating;
            return acc;
          }, {} as Record<string, RatingData>);
          
          setServiceRatings(ratingsMap);
        }
      } catch (error) {
        console.error('Error fetching recent services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentServices();
  }, []);

  const getRatingDisplay = (serviceId: string) => {
    const rating = serviceRatings[serviceId];
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

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('home.recentServices', 'الخدمات المضافة حديثاً')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t('home.recentServicesDescription', 'اكتشف أحدث الخدمات المتاحة للمغامرات')}
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

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('home.recentServices', 'الخدمات المضافة حديثاً')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('home.recentServicesDescription', 'اكتشف أحدث الخدمات المتاحة للمغامرات')}
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
            {services.map((service) => (
              <CarouselItem key={service.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow h-full">
                  <div className="relative">
                    <img 
                      src={service.thumbnail_url || service.image_url || service.detail_images?.[0] || ''} 
                      alt={service.name}
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
                        <MapPin className="w-12 h-12 text-primary/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">لا توجد صورة</p>
                      </div>
                    </div>
                    {service.categories && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-white/90">
                          {service.categories.name_ar || service.categories.name}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-primary">
                          {service.price > 0 ? `${service.price} ريال` : 'السعر حسب الطلب'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary smooth-transition line-clamp-2">
                        {service.name_ar || service.name}
                      </h3>
                      
                      {service.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{service.location_ar || service.location}</span>
                        </div>
                      )}

                      {service.duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{service.duration_minutes} دقيقة</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {getRatingDisplay(service.id)}
                      </div>

                      {service.profiles && (
                        <p className="text-sm text-muted-foreground truncate">
                          مقدم الخدمة: {service.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/service/${service.id}`}>
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
            <Link to="/services">
              عرض جميع الخدمات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentServices;
