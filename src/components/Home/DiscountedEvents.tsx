import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Percent, Trophy, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageContext } from "@/contexts/LanguageContext";

const DiscountedEvents = () => {
  const { language } = useLanguageContext();

  const { data: discountedServices = [], isLoading: loading } = useQuery({
    queryKey: ['services', 'discount'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          name_ar,
          description,
          description_ar,
          location,
          location_ar,
          image_url,
          thumbnail_url,
          price,
          discount_percentage,
          original_price,
          cities (
            name,
            name_ar
          )
        `)
        .eq('service_type', 'discount')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              الخصومات
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              عروض خاصة وخصومات حصرية على الفعاليات المميزة
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

  if (discountedServices.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            الخصومات
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            عروض خاصة وخصومات حصرية على الفعاليات المميزة
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
            {discountedServices.map((service) => (
              <CarouselItem key={service.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full border-primary/20">
                  <div className="relative">
                    {service.image_url || service.thumbnail_url ? (
                      <img 
                        src={service.image_url || service.thumbnail_url} 
                        alt={language === 'ar' ? service.name_ar : service.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Trophy className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    {service.discount_percentage && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Percent className="w-3 h-3 ml-1" />
                          خصم {service.discount_percentage}%
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        {service.original_price && service.discount_percentage ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground line-through">
                              {service.original_price} ريال
                            </span>
                            <span className="text-sm font-bold text-primary">
                              {service.price} ريال
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {service.price} ريال
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {language === 'ar' ? service.name_ar : service.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {service.cities 
                            ? (language === 'ar' ? service.cities.name_ar : service.cities.name)
                            : (language === 'ar' ? service.location_ar : service.location)
                          }
                        </span>
                      </div>

                      {service.original_price && service.discount_percentage && (
                        <div className="pt-2">
                          <p className="text-xs text-primary font-medium">
                            وفر {service.original_price - service.price} ريال
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/service/${service.id}`}>
                        احجز بالخصم
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
            <Link to="/services/discount-services">
              عرض جميع الخصومات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DiscountedEvents;
