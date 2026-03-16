import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Percent, Trophy, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageContext } from "@/contexts/LanguageContext";
import SectionHeader from './SectionHeader';

const DiscountedEvents = () => {
  const { language } = useLanguageContext();

  const { data: discountedServices = [], isLoading: loading } = useQuery({
    queryKey: ['services', 'discount', 'home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`id, name, name_ar, description, description_ar, location, location_ar, image_url, thumbnail_url, price, discount_percentage, original_price, service_type, cities (name, name_ar)`)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const filtered = (data || []).filter(s => {
        const type = s.service_type?.toLowerCase()?.trim();
        return type === 'discount' || (s.discount_percentage != null && s.discount_percentage > 0);
      });
      return filtered.slice(0, 8);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const title = language === 'ar' ? 'الخصومات' : 'Discounts';
  const subtitle = language === 'ar' ? 'عروض خاصة وخصومات حصرية على الفعاليات المميزة' : 'Special offers and exclusive discounts';

  if (loading) {
    return (
      <section className="py-12 section-alt">
        <div className="container mx-auto px-4">
          <SectionHeader title={title} subtitle={subtitle} accentColor="orange" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-44 rounded-t-lg"></div>
                <div className="p-4 space-y-3">
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
    <section className="py-12 section-alt">
      <div className="container mx-auto px-4">
        <SectionHeader title={title} subtitle={subtitle} accentColor="orange" />

        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent className="-ml-4">
            {discountedServices.map((service) => (
              <CarouselItem key={service.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full border-transparent hover:border-[hsl(var(--brand-orange)/0.35)]">
                  <div className="relative">
                    {service.image_url || service.thumbnail_url ? (
                      <img src={service.image_url || service.thumbnail_url} alt={language === 'ar' ? service.name_ar : service.name} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-[hsl(var(--brand-orange)/0.12)] to-primary/10 flex items-center justify-center">
                        <Trophy className="w-14 h-14 text-[hsl(var(--brand-orange)/0.3)]" />
                      </div>
                    )}
                    {service.discount_percentage && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="orange" className="text-xs">
                          <Percent className="w-3 h-3 ml-1" />
                          {language === 'ar' ? `خصم ${service.discount_percentage}%` : `${service.discount_percentage}% OFF`}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1">
                        {service.original_price && service.discount_percentage ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground line-through">{service.original_price} ريال</span>
                            <span className="text-xs font-bold text-[hsl(var(--brand-orange))]">{service.price} ريال</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[hsl(var(--brand-lime))]">{service.price} ريال</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {language === 'ar' ? service.name_ar : service.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {service.cities ? (language === 'ar' ? service.cities.name_ar : service.cities.name) : (language === 'ar' ? service.location_ar : service.location)}
                        </span>
                      </div>
                      {service.original_price && service.discount_percentage && (
                        <p className="text-xs text-[hsl(var(--brand-orange))] font-medium">
                          {language === 'ar' ? `وفر ${service.original_price - service.price} ريال` : `Save ${service.original_price - service.price} SAR`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pb-4">
                    <Button asChild className="w-full" size="sm" variant="brand">
                      <Link to={`/service/${service.id}`}>{language === 'ar' ? 'احجز بالخصم' : 'Book Now'}</Link>
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
          <Button asChild size="lg" variant="outline" className="border-[hsl(var(--brand-orange)/0.3)] hover:border-[hsl(var(--brand-orange))]">
            <Link to="/services/discount-services">{language === 'ar' ? 'عرض جميع الخصومات' : 'View All Discounts'}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DiscountedEvents;
