import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy, Target, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";

const MyTrainings = () => {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<any[]>([]);
  const { user } = useAuth();
  const { language } = useLanguageContext();

  useEffect(() => {
    const fetchMyTrainings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get services user has bookings for
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('service_bookings')
          .select('service_id')
          .eq('user_id', user.id)
          .in('status', ['pending', 'confirmed', 'completed']);

        if (bookingsError) throw bookingsError;

        if (!bookingsData || bookingsData.length === 0) {
          setTrainings([]);
          setLoading(false);
          return;
        }

        const serviceIds = bookingsData.map(b => b.service_id);

        // Get training services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            id,
            name,
            name_ar,
            description,
            description_ar,
            location,
            location_ar,
            price,
            image_url,
            thumbnail_url,
            trainer_name,
            training_level,
            start_date,
            end_date,
            duration_per_set,
            number_of_sets,
            current_capacity,
            max_capacity,
            city_id,
            cities (
              name,
              name_ar
            )
          `)
          .in('id', serviceIds)
          .eq('service_type', 'training')
          .eq('status', 'active')
          .order('start_date', { ascending: true })
          .limit(8);

        if (servicesError) throw servicesError;

        setTrainings(servicesData || []);
      } catch (error) {
        console.error('Error fetching trainings:', error);
        setTrainings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTrainings();
  }, [user]);

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              تدريباتي
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              التدريبات المنضم لها
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

  if (trainings.length === 0) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              تدريباتي
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              التدريبات المنضم لها
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">لم تنضم لأي تدريبات بعد</p>
            <Button asChild variant="outline">
              <Link to="/services">تصفح التدريبات</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            تدريباتي
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            البرامج التدريبية المخصصة لتطوير مهاراتك
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
            {trainings.map((training) => (
              <CarouselItem key={training.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full">
                  <div className="relative">
                    {training.image_url || training.thumbnail_url ? (
                      <img 
                        src={training.image_url || training.thumbnail_url} 
                        alt={language === 'ar' ? training.name_ar : training.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                        <Trophy className="w-16 h-16 text-secondary/30" />
                      </div>
                    )}
                    {training.training_level && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                          {training.training_level === 'beginner' ? 'مبتدئ' : 
                           training.training_level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-primary">
                          {training.price ? `${training.price} ريال` : 'مجاني'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {language === 'ar' ? training.name_ar : training.name}
                      </h3>
                      
                      {training.trainer_name && (
                        <p className="text-sm text-muted-foreground">
                          المدرب: {training.trainer_name}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {training.cities 
                            ? (language === 'ar' ? training.cities.name_ar : training.cities.name)
                            : (language === 'ar' ? training.location_ar : training.location)
                          }
                        </span>
                      </div>

                      {training.start_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{new Date(training.start_date).toLocaleDateString('ar-SA')}</span>
                        </div>
                      )}

                      {training.duration_per_set && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{training.duration_per_set} دقيقة</span>
                        </div>
                      )}

                      {training.number_of_sets && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4 flex-shrink-0" />
                          <span>{training.number_of_sets} جلسة</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/service/${training.id}`}>
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
              عرض جميع التدريبات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MyTrainings;
