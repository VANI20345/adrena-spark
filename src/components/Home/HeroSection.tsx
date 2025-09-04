import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Calendar, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/hero-bg.jpg';

const HeroSection = () => {
  const [searchCity, setSearchCity] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Mock trending events data
  const trendingEvents = [
    {
      id: 1,
      title: 'هايكنج جبل طويق المتقدم',
      city: 'الرياض',
      date: '2024-03-15',
      price: 200,
      participants: 18,
      maxParticipants: 25,
      image: '/api/placeholder/300/200',
      trending: true
    },
    {
      id: 2,
      title: 'غوص في أعماق البحر الأحمر',
      city: 'جدة',
      date: '2024-03-18',
      price: 350,
      participants: 12,
      maxParticipants: 15,
      image: '/api/placeholder/300/200',
      trending: true
    },
    {
      id: 3,
      title: 'تخييم صحراوي فاخر',
      city: 'القصيم',
      date: '2024-03-22',
      price: 280,
      participants: 20,
      maxParticipants: 30,
      image: '/api/placeholder/300/200',
      trending: true
    }
  ];

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
                      <SelectItem value="riyadh">الرياض</SelectItem>
                      <SelectItem value="jeddah">جدة</SelectItem>
                      <SelectItem value="taif">الطائف</SelectItem>
                      <SelectItem value="qassim">القصيم</SelectItem>
                      <SelectItem value="dammam">الدمام</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger className="bg-white/90 border-white/30">
                      <SelectValue placeholder="نوع الفعالية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hiking">هايكنج</SelectItem>
                      <SelectItem value="diving">غوص</SelectItem>
                      <SelectItem value="camping">تخييم</SelectItem>
                      <SelectItem value="cycling">دراجات</SelectItem>
                      <SelectItem value="climbing">تسلق</SelectItem>
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
          {trendingEvents.map((event) => (
            <Card key={event.id} className="group overflow-hidden hover:shadow-xl smooth-transition adventure-shadow">
              <div className="relative">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-105 smooth-transition"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-red-500 text-white">
                    <TrendingUp className="w-3 h-3 ml-1" />
                    رائج
                  </Badge>
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-sm font-bold text-primary">
                      {event.price} ريال
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold group-hover:text-primary smooth-transition">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.city}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {event.participants}/{event.maxParticipants} مشارك
                    </div>
                    <div className="text-right">
                      {event.maxParticipants - event.participants <= 5 && (
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
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <Link to="/explore">
              عرض جميع الفعاليات
            </Link>
          </Button>
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-primary to-blue-600 py-16">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            عروض وأكواد خصم فعّالة
          </h2>
          <p className="text-xl mb-8 opacity-90">
            استخدم كود WELCOME10 واحصل على خصم 10% على أول حجز
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
              <span className="text-2xl font-bold font-mono">WELCOME10</span>
            </div>
            <Button size="lg" variant="secondary">
              استخدم الكود الآن
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;