import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Star, Search, Filter, Map } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";

const Explore = () => {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - would come from API
  const events = [
    {
      id: "1",
      title: "هايكنج جبل طويق المتقدم",
      image: "/api/placeholder/400/250",
      location: "الرياض",
      date: "2024-03-15",
      time: "06:00",
      duration: "8 ساعات",
      difficulty: "صعب",
      price: 200,
      maxParticipants: 15,
      currentParticipants: 12,
      rating: 4.9,
      reviewsCount: 89,
      organizer: "نادي المغامرات الرياض",
      category: "هايكنج",
      description: "مسار متقدم لعشاق التحدي مع إطلالات خلابة"
    },
    {
      id: "2",
      title: "غوص في أعماق البحر الأحمر",
      image: "/api/placeholder/400/250",
      location: "جدة",
      date: "2024-03-18",
      time: "08:00",
      duration: "6 ساعات",
      difficulty: "متوسط",
      price: 350,
      maxParticipants: 10,
      currentParticipants: 7,
      rating: 4.8,
      reviewsCount: 124,
      organizer: "مدرسة الغوص المتقدم",
      category: "غوص",
      description: "استكشف الشعاب المرجانية الرائعة"
    },
    {
      id: "3",
      title: "تخييم صحراوي فاخر",
      image: "/api/placeholder/400/250",
      location: "القصيم",
      date: "2024-03-22",
      time: "15:00",
      duration: "24 ساعة",
      difficulty: "سهل",
      price: 280,
      maxParticipants: 25,
      currentParticipants: 18,
      rating: 4.7,
      reviewsCount: 156,
      organizer: "فريق الصحراء للتخييم",
      category: "تخييم",
      description: "ليلة سحرية في قلب الصحراء مع أنشطة متنوعة"
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            استكشف الفعاليات
          </h1>
          <p className="text-lg text-muted-foreground">
            اكتشف مغامرات مثيرة في جميع أنحاء المملكة
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-xl p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ابحث عن فعالية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المدن</SelectItem>
                <SelectItem value="riyadh">الرياض</SelectItem>
                <SelectItem value="jeddah">جدة</SelectItem>
                <SelectItem value="taif">الطائف</SelectItem>
                <SelectItem value="qassim">القصيم</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="نوع النشاط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنشطة</SelectItem>
                <SelectItem value="hiking">هايكنج</SelectItem>
                <SelectItem value="diving">غوص</SelectItem>
                <SelectItem value="camping">تخييم</SelectItem>
                <SelectItem value="cycling">دراجات</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="الصعوبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="easy">سهل</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="hard">صعب</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Filter className="w-4 h-4 ml-2" />
                المزيد
              </Button>
              <Button 
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-1">
                  <div className="bg-current w-1 h-1 rounded-sm"></div>
                  <div className="bg-current w-1 h-1 rounded-sm"></div>
                  <div className="bg-current w-1 h-1 rounded-sm"></div>
                  <div className="bg-current w-1 h-1 rounded-sm"></div>
                </div>
              </Button>
              <Button 
                variant={viewMode === "map" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("map")}
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            تم العثور على {events.length} فعالية
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                  
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

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {event.currentParticipants}/{event.maxParticipants}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{event.rating}</span>
                      <span className="text-muted-foreground">({event.reviewsCount})</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-6 pb-6">
                <div className="flex gap-2 w-full">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={`/event/${event.id}`}>
                      التفاصيل
                    </Link>
                  </Button>
                  <Button className="flex-1">
                    احجز الآن
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Explore;