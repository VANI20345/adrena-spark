import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star, Percent, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const DiscountedEvents = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Tag className="w-8 h-8 text-destructive" />
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

  // TODO: Replace with real data from database
  const discountedEvents: any[] = [];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center gap-3">
            <Tag className="w-8 h-8 text-destructive" />
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
            {discountedEvents.map((event) => (
              <CarouselItem key={event.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full border-destructive/20">
                  <div className="relative">
                    <div className="w-full h-48 bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
                      <Percent className="w-16 h-16 text-destructive/30" />
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge className="bg-destructive text-destructive-foreground">
                        <Percent className="w-3 h-3 ml-1" />
                        خصم {event.discount}%
                      </Badge>
                    </div>
                    {event.limitedOffer && (
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="bg-yellow-500 text-white">
                          عرض محدود
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground line-through">
                            {event.originalPrice} ريال
                          </span>
                          <span className="text-sm font-bold text-destructive">
                            {event.discountedPrice} ريال
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString('ar-SA')}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {event.attendees}/{event.maxAttendees}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{event.rating} ({event.reviews})</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-xs text-destructive font-medium">
                          وفر {event.originalPrice - event.discountedPrice} ريال
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full bg-destructive hover:bg-destructive/90" size="sm">
                      <Link to={`/event/${event.id}`}>
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
            <Link to="/explore">
              عرض جميع الخصومات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DiscountedEvents;
