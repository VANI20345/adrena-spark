import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Star, Search, Filter, Map } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { eventsService, categoriesService } from "@/services/supabaseServices";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Explore = () => {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const { t } = useLanguageContext();

  useEffect(() => {
    // Get URL parameters for search
    const urlParams = new URLSearchParams(window.location.search);
    const cityParam = urlParams.get('city');
    const categoryParam = urlParams.get('category');
    const dateParam = urlParams.get('date');
    
    if (cityParam) setSelectedCity(cityParam);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (dateParam) setSelectedDate(dateParam);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventsResponse, categoriesResponse, citiesResponse] = await Promise.all([
          eventsService.getAll(),
          categoriesService.getAll(),
          supabase.from('cities').select('*').eq('is_active', true).order('name_ar')
        ]);

        if (eventsResponse.error) throw eventsResponse.error;
        if (categoriesResponse.error) throw categoriesResponse.error;
        if (citiesResponse.error) throw citiesResponse.error;

        setEvents(eventsResponse.data || []);
        setCategories(categoriesResponse.data || []);
        setCities(citiesResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter events based on search and filters
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.title_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description_ar?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === "all" || 
      event.location?.toLowerCase().includes(selectedCity.toLowerCase()) ||
      event.location_ar?.toLowerCase().includes(selectedCity.toLowerCase());

    const matchesCategory = selectedCategory === "all" || 
      event.category_id === selectedCategory;

    const matchesDifficulty = selectedDifficulty === "all" || 
      event.difficulty_level === selectedDifficulty;
    
    const matchesDate = !selectedDate || 
      new Date(event.start_date).toISOString().split('T')[0] === selectedDate;

    return matchesSearch && matchesCity && matchesCategory && matchesDifficulty && matchesDate;
  });

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

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المدن</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.name_ar.toLowerCase()}>
                    {city.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="نوع النشاط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنشطة</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name_ar || category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="التاريخ"
            />

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
            تم العثور على {filteredEvents.length} فعالية
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : (
          /* Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.length > 0 ? filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden group hover:shadow-lg smooth-transition adventure-shadow">
                <div className="relative">
                  <img 
                    src={event.image_url || "/api/placeholder/800/400"} 
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                  />
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
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description_ar || event.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {(event.location_ar || event.location)?.split(' - ')[0]}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.start_date).toLocaleDateString('ar-SA')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {event.current_attendees || 0}/{event.max_attendees || 'غير محدود'}
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
                    <Button asChild className="flex-1">
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
                  لا توجد فعاليات تطابق المعايير المحددة
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Explore;