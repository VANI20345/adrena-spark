import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  DollarSign,
  Users,
  Star,
  X,
  SlidersHorizontal
} from 'lucide-react';

interface SearchFilters {
  query: string;
  category: string;
  city: string;
  priceRange: [number, number];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  rating: number;
  difficulty: string;
  capacity: string;
  eventType: 'events' | 'services' | 'both';
}

interface AdvancedSearchProps {
  onSearchResults: (results: any[], filters: SearchFilters) => void;
  placeholder?: string;
  type?: 'events' | 'services' | 'both';
}

export const AdvancedSearch = ({ 
  onSearchResults, 
  placeholder = "ابحث عن الفعاليات والخدمات...",
  type = 'both'
}: AdvancedSearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    city: '',
    priceRange: [0, 10000],
    dateRange: {},
    rating: 0,
    difficulty: '',
    capacity: '',
    eventType: type
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load categories and cities from Supabase
  useEffect(() => {
    loadCategoriesAndCities();
  }, []);

  const loadCategoriesAndCities = async () => {
    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name_ar, name');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Load cities from events/services
      const { data: eventsData } = await supabase
        .from('events')
        .select('location_ar, location');

      const { data: servicesData } = await supabase
        .from('services')
        .select('location_ar, location');

      const allLocations = [
        ...(eventsData?.map(e => e.location_ar || e.location) || []),
        ...(servicesData?.map(s => s.location_ar || s.location) || [])
      ];
      
      const uniqueCities = [...new Set(allLocations.filter(Boolean))];
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  const performSearch = async () => {
    setIsLoading(true);
    try {
      let results: any[] = [];

      // Search events if enabled
      if (filters.eventType === 'events' || filters.eventType === 'both') {
        let eventQuery = supabase
          .from('events')
          .select(`
            *,
            categories(name_ar, name)
          `)
          .eq('status', 'active');

        // Apply filters
        if (filters.query) {
          eventQuery = eventQuery.or(`title_ar.ilike.%${filters.query}%,title.ilike.%${filters.query}%,description_ar.ilike.%${filters.query}%`);
        }
        
        if (filters.category) {
          eventQuery = eventQuery.eq('category_id', filters.category);
        }
        
        if (filters.city) {
          eventQuery = eventQuery.or(`location_ar.ilike.%${filters.city}%,location.ilike.%${filters.city}%`);
        }
        
        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
          eventQuery = eventQuery.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1]);
        }
        
        if (filters.dateRange.from) {
          eventQuery = eventQuery.gte('start_date', filters.dateRange.from.toISOString());
        }
        
        if (filters.dateRange.to) {
          eventQuery = eventQuery.lte('end_date', filters.dateRange.to.toISOString());
        }

        const { data: eventsData, error: eventsError } = await eventQuery.order('created_at', { ascending: false });
        
        if (eventsError) throw eventsError;
        results = [...results, ...(eventsData || [])];
      }

      // Search services if enabled
      if (filters.eventType === 'services' || filters.eventType === 'both') {
        let serviceQuery = supabase
          .from('services')
          .select(`
            *,
            categories(name_ar, name)
          `)
          .eq('status', 'active');

        // Apply filters
        if (filters.query) {
          serviceQuery = serviceQuery.or(`name_ar.ilike.%${filters.query}%,name.ilike.%${filters.query}%,description_ar.ilike.%${filters.query}%`);
        }
        
        if (filters.category) {
          serviceQuery = serviceQuery.eq('category_id', filters.category);
        }
        
        if (filters.city) {
          serviceQuery = serviceQuery.or(`location_ar.ilike.%${filters.city}%,location.ilike.%${filters.city}%`);
        }
        
        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
          serviceQuery = serviceQuery.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1]);
        }

        const { data: servicesData, error: servicesError } = await serviceQuery.order('created_at', { ascending: false });
        
        if (servicesError) throw servicesError;
        results = [...results, ...(servicesData || [])];
      }

      onSearchResults(results, filters);
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults([], filters);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (filters.query || filters.category || filters.city) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [filters.query, filters.category, filters.city]);

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      city: '',
      priceRange: [0, 10000],
      dateRange: {},
      rating: 0,
      difficulty: '',
      capacity: '',
      eventType: type
    });
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <CardTitle>البحث المتقدم</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-4 w-4 ml-2" />
            {showAdvanced ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-4 pr-10"
          />
          {isLoading && (
            <div className="absolute left-3 top-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع الفئات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name_ar || category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.city} onValueChange={(value) => updateFilter('city', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="المدينة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع المدن</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === 'both' && (
            <Select value={filters.eventType} onValueChange={(value) => updateFilter('eventType', value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">الكل</SelectItem>
                <SelectItem value="events">فعاليات</SelectItem>
                <SelectItem value="services">خدمات</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(filters.query || filters.category || filters.city) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 ml-1" />
              مسح الفلاتر
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                نطاق السعر: {filters.priceRange[0]} - {filters.priceRange[1]} ريال
              </label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                max={10000}
                step={50}
                className="w-full"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">من تاريخ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 ml-2" />
                      {filters.dateRange.from ? filters.dateRange.from.toLocaleDateString('ar-SA') : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">إلى تاريخ</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 ml-2" />
                      {filters.dateRange.to ? filters.dateRange.to.toLocaleDateString('ar-SA') : 'اختر التاريخ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-2 gap-4">
              <Select value={filters.difficulty} onValueChange={(value) => updateFilter('difficulty', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="مستوى الصعوبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع المستويات</SelectItem>
                  <SelectItem value="سهل">سهل</SelectItem>
                  <SelectItem value="متوسط">متوسط</SelectItem>
                  <SelectItem value="صعب">صعب</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.capacity} onValueChange={(value) => updateFilter('capacity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="حجم المجموعة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">أي حجم</SelectItem>
                  <SelectItem value="small">صغيرة (1-10)</SelectItem>
                  <SelectItem value="medium">متوسطة (11-30)</SelectItem>
                  <SelectItem value="large">كبيرة (31+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                التقييم الأدنى: {filters.rating} نجوم
              </label>
              <Slider
                value={[filters.rating]}
                onValueChange={([value]) => updateFilter('rating', value)}
                max={5}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Search Button */}
        <Button 
          onClick={performSearch} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'جاري البحث...' : 'بحث'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvancedSearch;