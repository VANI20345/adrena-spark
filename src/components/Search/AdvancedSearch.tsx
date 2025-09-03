import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    priceRange: [0, 2000],
    dateRange: {},
    rating: 0,
    difficulty: '',
    capacity: '',
    eventType: type
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const cities = [
    'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
    'الطائف', 'تبوك', 'الخبر', 'خميس مشيط', 'الأحساء'
  ];

  const categories = [
    'مغامرات', 'رياضة', 'ثقافة', 'طعام', 'تعليم', 'فنون',
    'تقنية', 'صحة', 'عائلية', 'طبيعة'
  ];

  const difficulties = ['سهل', 'متوسط', 'صعب', 'للمحترفين'];

  const capacities = ['أقل من 10', '10-25', '25-50', '50-100', 'أكثر من 100'];

  // Mock search results
  const mockResults = [
    {
      id: '1',
      title: 'رحلة جبلية مثيرة',
      type: 'event',
      category: 'مغامرات',
      city: 'الرياض',
      price: 350,
      rating: 4.8,
      difficulty: 'متوسط',
      capacity: 25,
      date: new Date(2024, 2, 15),
      image: '/placeholder.svg'
    },
    {
      id: '2',
      title: 'ورشة طبخ إيطالي',
      type: 'event',
      category: 'طعام',
      city: 'جدة',
      price: 180,
      rating: 4.6,
      difficulty: 'سهل',
      capacity: 15,
      date: new Date(2024, 2, 20),
      image: '/placeholder.svg'
    }
  ];

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.city) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 2000) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.rating > 0) count++;
    if (filters.difficulty) count++;
    if (filters.capacity) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const handleSearch = () => {
    // Filter mock results based on criteria
    let results = mockResults.filter(item => {
      if (filters.eventType !== 'both' && item.type !== filters.eventType.slice(0, -1)) return false;
      if (filters.query && !item.title.toLowerCase().includes(filters.query.toLowerCase())) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.city && item.city !== filters.city) return false;
      if (item.price < filters.priceRange[0] || item.price > filters.priceRange[1]) return false;
      if (filters.rating && item.rating < filters.rating) return false;
      if (filters.difficulty && item.difficulty !== filters.difficulty) return false;
      
      return true;
    });

    onSearchResults(results, filters);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      city: '',
      priceRange: [0, 2000],
      dateRange: {},
      rating: 0,
      difficulty: '',
      capacity: '',
      eventType: type
    });
  };

  const removeFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      switch (filterKey) {
        case 'priceRange':
          newFilters.priceRange = [0, 2000];
          break;
        case 'dateRange':
          newFilters.dateRange = {};
          break;
        case 'rating':
          newFilters.rating = 0;
          break;
        default:
          (newFilters as any)[filterKey] = '';
      }
      return newFilters;
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="relative"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              فلاتر
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              بحث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
          
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('category')}
              />
            </Badge>
          )}
          
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {filters.city}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('city')}
              />
            </Badge>
          )}
          
          {(filters.priceRange[0] > 0 || filters.priceRange[1] < 2000) && (
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {filters.priceRange[0]} - {filters.priceRange[1]} ريال
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('priceRange')}
              />
            </Badge>
          )}
          
          {filters.rating > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {filters.rating}+ نجوم
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('rating')}
              />
            </Badge>
          )}
          
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            مسح الكل
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <CardTitle>البحث المتقدم</CardTitle>
            <CardDescription>
              استخدم الفلاتر التالية للعثور على ما تبحث عنه بدقة
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">الفئة</label>
              <Select value={filters.category} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, category: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المدينة</label>
              <Select value={filters.city} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, city: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">مستوى الصعوبة</label>
              <Select value={filters.difficulty} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, difficulty: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                نطاق السعر: {filters.priceRange[0]} - {filters.priceRange[1]} ريال
              </label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))
                }
                max={2000}
                min={0}
                step={50}
                className="w-full"
              />
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">التقييم الأدنى</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${
                      star <= filters.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      rating: star === prev.rating ? 0 : star 
                    }))}
                  />
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">التاريخ</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateRange.from ? 
                        filters.dateRange.from.toLocaleDateString('ar-SA') : 
                        'من تاريخ'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: date } 
                      }))}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateRange.to ? 
                        filters.dateRange.to.toLocaleDateString('ar-SA') : 
                        'إلى تاريخ'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: date } 
                      }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};