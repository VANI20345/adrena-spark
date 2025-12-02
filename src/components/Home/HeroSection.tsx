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
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"> لا تُنسى</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
              انضم لأفضل الفعاليات والمغامرات في المملكة العربية السعودية واستمتع بتجارب استثنائية
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 bg-primary hover:bg-primary-glow" asChild>
                <Link to="/discover-groups">
                  قم بالانضمام الى قروبات
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 dark:bg-primary/20 border-white/30 dark:border-primary/40 text-white hover:bg-white/20 dark:hover:bg-primary/30" asChild>
                <Link to="/services">
                  تصفح الخدمات
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HeroSection;