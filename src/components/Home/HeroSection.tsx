import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Calendar, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { eventsService, citiesService, categoriesService } from '@/services/supabaseServices';
import heroImage from '@/assets/hero-bg.jpg';

interface City {
  id: string;
  name: string;
  name_ar: string;
}

interface Category {
  id: string;
  name: string;
  name_ar: string;
}

interface TrendingEvent {
  id: string;
  title: string;
  title_ar?: string;
  location: string;
  location_ar?: string;
  start_date: string;
  price: number;
  current_attendees: number;
  max_attendees: number;
  image_url?: string;
  featured: boolean;
}

const HeroSection = () => {
  const [searchCity, setSearchCity] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [eventsResponse, citiesResponse, categoriesResponse] = await Promise.all([
          eventsService.getAll(),
          citiesService.getAll(), 
          categoriesService.getAll()
        ]);

        if (eventsResponse.data) {
          // Get trending/featured events (limited to 3)
          const trending = eventsResponse.data
            .filter(event => event.featured || event.current_attendees > 0)
            .slice(0, 3);
          setTrendingEvents(trending);
        }

        if (citiesResponse.data) {
          setCities(citiesResponse.data);
        }

        if (categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

      } catch (error) {
        console.error('Error fetching hero data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = () => {
    // Navigate to explore with search parameters
    const params = new URLSearchParams();
    if (searchCity) params.append('city', searchCity);
    if (searchCategory) params.append('category', searchCategory);
    if (searchDate) params.append('date', searchDate);
    
    window.location.href = `/explore?${params.toString()}`;
  };

  return (
    <div className="relative">
      {/* Hero Background */}
      <div 
        className="relative h-[80vh] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
        
        {/* Hero Content */}
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              اكتشف مغامرات 
              <span className="text-gradient bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> لا تُنسى</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
              انضم لأفضل الفعاليات والمغامرات في المملكة العربية السعودية واستمتع بتجارب استثنائية
            </p>

            {/* Search Banner */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 mb-8">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={searchCity} onValueChange={setSearchCity}>
                    <SelectTrigger className="bg-white/90 border-white/30">
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger className="bg-white/90 border-white/30">
                      <SelectValue placeholder="نوع الفعالية" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="bg-white/90 border-white/30"
                  />

                  <Button 
                    onClick={handleSearch}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    <Search className="w-4 h-4 ml-2" />
                    بحث
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link to="/explore">
                  استكشف الفعاليات
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 border-white/30 text-white hover:bg-white/20" asChild>
                <Link to="/services">
                  تصفح الخدمات
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Events Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">الفعاليات الرائجة</h2>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            اكتشف أكثر الفعاليات إقبالاً هذا الأسبوع واحجز مقعدك قبل انتهاء المقاعد
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            // Loading skeletons
            [1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="bg-gray-300 h-48"></div>
                <CardContent className="p-6 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                </CardContent>
              </Card>
            ))
          ) : trendingEvents.length > 0 ? (
            trendingEvents.map((event) => (
              <Card key={event.id} className="group overflow-hidden hover:shadow-xl smooth-transition adventure-shadow">
                <div className="relative">
                  <img 
                    src={event.image_url || ''} 
                    alt={event.title_ar || event.title}
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
                      <TrendingUp className="w-12 h-12 text-primary/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد صورة</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-red-500 text-white">
                      <TrendingUp className="w-3 h-3 ml-1" />
                      رائج
                    </Badge>
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
                    <h3 className="text-xl font-semibold group-hover:text-primary smooth-transition">
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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {event.current_attendees}/{event.max_attendees || 'غير محدود'} مشارك
                      </div>
                      <div className="text-right">
                        {event.max_attendees && (event.max_attendees - event.current_attendees <= 5) && (
                          <Badge variant="destructive" className="text-xs">
                            مقاعد محدودة
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button className="w-full group-hover:bg-primary/90 smooth-transition" asChild>
                        <Link to={`/event/${event.id}`}>
                          احجز الآن
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={Sparkles}
                title="لا توجد فعاليات رائجة حالياً"
                description="لم نتمكن من العثور على فعاليات رائجة في الوقت الحالي. تصفح جميع الفعاليات المتاحة لاستكشاف المزيد من الخيارات الرائعة."
                actionLabel="تصفح جميع الفعاليات"
                onAction={() => window.location.href = '/explore'}
              />
            </div>
          )}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <Link to="/explore">
              عرض جميع الفعاليات
            </Link>
          </Button>
        </div>
      </div>

    </div>
  );
};

export default HeroSection;