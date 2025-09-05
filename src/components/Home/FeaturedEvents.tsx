import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturedEvents = () => {
  const events = [
    {
      id: "1",
      title: "هايكنج جبل طويق",
      image: "/api/placeholder/400/250",
      location: "الرياض",
      date: "2024-03-15",
      time: "06:00",
      duration: "6 ساعات",
      difficulty: "متوسط",
      price: 150,
      maxParticipants: 25,
      currentParticipants: 18,
      rating: 4.8,
      reviewsCount: 124,
      organizer: "نادي المغامرات الرياض",
      category: "هايكنج"
    },
    {
      id: "2",
      title: "غوص في البحر الأحمر",
      image: "/api/placeholder/400/250",
      location: "جدة",
      date: "2024-03-20",
      time: "08:00",
      duration: "4 ساعات",
      difficulty: "مبتدئ",
      price: 280,
      maxParticipants: 12,
      currentParticipants: 8,
      rating: 4.9,
      reviewsCount: 87,
      organizer: "مدرسة الغوص المتقدم",
      category: "غوص"
    },
    {
      id: "3",
      title: "تخييم في صحراء النفود",
      image: "/api/placeholder/400/250",
      location: "القصيم",
      date: "2024-03-25",
      time: "16:00",
      duration: "24 ساعة",
      difficulty: "سهل",
      price: 320,
      maxParticipants: 30,
      currentParticipants: 22,
      rating: 4.7,
      reviewsCount: 156,
      organizer: "فريق الصحراء للتخييم",
      category: "تخييم"
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "سهل": return "bg-green-100 text-green-800";
      case "متوسط": return "bg-yellow-100 text-yellow-800";
      case "صعب": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            الفعاليات المميزة
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اكتشف أفضل المغامرات والأنشطة الخارجية المتاحة هذا الأسبوع
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
              <div className="relative">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge className={getDifficultyColor(event.difficulty)}>
                    {event.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/90">
                    {event.category}
                  </Badge>
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-primary">
                      {event.price} ريال
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
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {event.currentParticipants}/{event.maxParticipants}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {event.rating} ({event.reviewsCount})
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    منظم بواسطة: {event.organizer}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="px-6 pb-6">
                <div className="flex gap-2 w-full">
                  <Button asChild className="flex-1">
                    <Link to={`/event/${event.id}`}>
                      عرض التفاصيل
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1">
                    احجز الآن
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
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

export default FeaturedEvents;