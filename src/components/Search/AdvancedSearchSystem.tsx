import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  MapPin, 
  Star, 
  Clock, 
  Users, 
  TrendingUp,
  X,
  Settings,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SearchFilters {
  query: string;
  category: string;
  city: string;
  priceRange: [number, number];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  rating: number;
  difficulty: string[];
  capacity: string;
  eventType: string;
  duration: string;
  featured: boolean;
  instantBook: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SearchResult {
  id: string;
  title: string;
  title_ar: string;
  category: string;
  city: string;
  price: number;
  rating: number;
  date: string;
  image?: string;
  description?: string;
  difficulty?: string;
  capacity?: number;
  duration?: string;
  featured?: boolean;
  instantBook?: boolean;
  organizer?: string;
  tags?: string[];
}

interface AdvancedSearchSystemProps {
  onSearchResults: (results: SearchResult[], filters: SearchFilters) => void;
  placeholder?: string;
  type?: 'events' | 'services' | 'both';
  showSuggestions?: boolean;
  autoSearch?: boolean;
}

const AdvancedSearchSystem: React.FC<AdvancedSearchSystemProps> = ({
  onSearchResults,
  placeholder,
  type = 'both',
  showSuggestions = true,
  autoSearch = true
}) => {
  const { t, isRTL } = useLanguageContext();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    city: '',
    priceRange: [0, 1000],
    dateFrom: undefined,
    dateTo: undefined,
    rating: 0,
    difficulty: [],
    capacity: '',
    eventType: '',
    duration: '',
    featured: false,
    instantBook: false,
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock data for demonstration
  const mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'Tuwaiq Mountain Advanced Hiking',
      title_ar: 'هايكنج جبل طويق المتقدم',
      category: 'hiking',
      city: 'riyadh',
      price: 200,
      rating: 4.8,
      date: '2024-03-15',
      difficulty: 'advanced',
      capacity: 25,
      duration: '6h',
      featured: true,
      instantBook: true,
      organizer: 'Adventure Saudi',
      tags: ['mountains', 'nature', 'fitness']
    },
    {
      id: '2',
      title: 'Red Sea Diving Experience',
      title_ar: 'تجربة غوص البحر الأحمر',
      category: 'diving',
      city: 'jeddah',
      price: 350,
      rating: 4.9,
      date: '2024-03-18',
      difficulty: 'intermediate',
      capacity: 15,
      duration: '8h',
      featured: true,
      instantBook: false,
      organizer: 'Coral Divers',
      tags: ['sea', 'diving', 'coral']
    },
    {
      id: '3',
      title: 'Desert Camping Experience',
      title_ar: 'تجربة التخييم الصحراوي',
      category: 'camping',
      city: 'qassim',
      price: 280,
      rating: 4.7,
      date: '2024-03-22',
      difficulty: 'easy',
      capacity: 30,
      duration: '24h',
      featured: false,
      instantBook: true,
      organizer: 'Desert Adventures',
      tags: ['desert', 'camping', 'stars']
    },
    {
      id: '4',
      title: 'Rock Climbing Workshop',
      title_ar: 'ورشة تسلق الصخور',
      category: 'climbing',
      city: 'taif',
      price: 180,
      rating: 4.6,
      date: '2024-03-25',
      difficulty: 'beginner',
      capacity: 20,
      duration: '4h',
      featured: false,
      instantBook: true,
      organizer: 'Summit Climbers',
      tags: ['climbing', 'rocks', 'workshop']
    }
  ];

  const categories = [
    { value: 'hiking', label: t('hiking') },
    { value: 'diving', label: t('diving') },
    { value: 'camping', label: t('camping') },
    { value: 'climbing', label: t('climbing') },
    { value: 'cycling', label: t('cycling') },
    { value: 'photography', label: t('photography') },
    { value: 'adventure', label: t('adventure') }
  ];

  const cities = [
    { value: 'riyadh', label: t('riyadh') },
    { value: 'jeddah', label: t('jeddah') },
    { value: 'taif', label: t('taif') },
    { value: 'qassim', label: t('qassim') },
    { value: 'dammam', label: t('dammam') },
    { value: 'abha', label: t('abha') },
    { value: 'tabuk', label: t('tabuk') }
  ];

  const difficulties = [
    { value: 'beginner', label: t('beginner') },
    { value: 'intermediate', label: t('intermediate') },
    { value: 'advanced', label: t('advanced') },
    { value: 'expert', label: t('expert') }
  ];

  const durations = [
    { value: '1h', label: t('oneHour') },
    { value: '2-4h', label: t('twoToFourHours') },
    { value: '4-8h', label: t('fourToEightHours') },
    { value: '8h+', label: t('moreThanEightHours') },
    { value: '1d', label: t('oneDay') },
    { value: '2-3d', label: t('twToThreeDays') },
    { value: '1w+', label: t('oneWeekOrMore') }
  ];

  const sortOptions = [
    { value: 'relevance', label: t('relevance') },
    { value: 'price', label: t('price') },
    { value: 'rating', label: t('rating') },
    { value: 'date', label: t('date') },
    { value: 'popularity', label: t('popularity') },
    { value: 'newest', label: t('newest') }
  ];

  // Generate search suggestions
  const generateSuggestions = (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const allSuggestions = [
      ...mockResults.map(r => isRTL ? r.title_ar : r.title),
      ...categories.map(c => c.label),
      ...cities.map(c => c.label),
      'غوص للمبتدئين',
      'هايكنج الرياض',
      'تخييم نهاية الأسبوع',
      'تسلق صخور',
      'دراجات هوائية',
      'تصوير طبيعة',
      'مغامرات صحراوية'
    ];

    const filtered = allSuggestions
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);
    
    setSuggestions(filtered);
  };

  // Handle search
  const handleSearch = () => {
    setIsSearching(true);
    
    // Add to search history
    if (filters.query && !searchHistory.includes(filters.query)) {
      setSearchHistory(prev => [filters.query, ...prev.slice(0, 9)]);
    }

    // Filter results based on current filters
    let filteredResults = mockResults.filter(result => {
      const matchesQuery = !filters.query || 
        (isRTL ? result.title_ar : result.title)
          .toLowerCase()
          .includes(filters.query.toLowerCase()) ||
        result.tags?.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()));

      const matchesCategory = !filters.category || result.category === filters.category;
      const matchesCity = !filters.city || result.city === filters.city;
      const matchesPrice = result.price >= filters.priceRange[0] && result.price <= filters.priceRange[1];
      const matchesRating = result.rating >= filters.rating;
      const matchesDifficulty = filters.difficulty.length === 0 || filters.difficulty.includes(result.difficulty || '');
      const matchesFeatured = !filters.featured || result.featured;
      const matchesInstantBook = !filters.instantBook || result.instantBook;

      // Date filtering
      let matchesDate = true;
      if (filters.dateFrom || filters.dateTo) {
        const resultDate = new Date(result.date);
        matchesDate = (!filters.dateFrom || resultDate >= filters.dateFrom) &&
                     (!filters.dateTo || resultDate <= filters.dateTo);
      }

      return matchesQuery && matchesCategory && matchesCity && matchesPrice && 
             matchesRating && matchesDifficulty && matchesFeatured && 
             matchesInstantBook && matchesDate;
    });

    // Sort results
    filteredResults.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'rating':
          comparison = b.rating - a.rating;
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'popularity':
          comparison = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    setTimeout(() => {
      setIsSearching(false);
      onSearchResults(filteredResults, filters);
    }, 500);
  };

  // Auto search on filter changes
  useEffect(() => {
    if (autoSearch) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  // Generate suggestions on query change
  useEffect(() => {
    if (showSuggestions) {
      generateSuggestions(filters.query);
    }
  }, [filters.query, showSuggestions]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      city: '',
      priceRange: [0, 1000],
      dateFrom: undefined,
      dateTo: undefined,
      rating: 0,
      difficulty: [],
      capacity: '',
      eventType: '',
      duration: '',
      featured: false,
      instantBook: false,
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  const removeFilter = (key: keyof SearchFilters) => {
    if (key === 'difficulty') {
      updateFilter(key, []);
    } else if (key === 'dateFrom' || key === 'dateTo') {
      updateFilter(key, undefined);
    } else if (key === 'priceRange') {
      updateFilter(key, [0, 1000]);
    } else if (key === 'rating') {
      updateFilter(key, 0);
    } else if (typeof filters[key] === 'boolean') {
      updateFilter(key, false);
    } else {
      updateFilter(key, '');
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.city) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.rating > 0) count++;
    if (filters.difficulty.length > 0) count++;
    if (filters.duration) count++;
    if (filters.featured) count++;
    if (filters.instantBook) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="w-full space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Input with Suggestions */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={placeholder || t('searchPlaceholder')}
                  value={filters.query}
                  onChange={(e) => {
                    updateFilter('query', e.target.value);
                    setShowSuggestionsDropdown(true);
                  }}
                  onFocus={() => setShowSuggestionsDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSuggestionsDropdown(false), 200)}
                  className="pl-10 pr-12"
                />
                {filters.query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => updateFilter('query', '')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Search Suggestions */}
              {showSuggestionsDropdown && (suggestions.length > 0 || searchHistory.length > 0) && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border rounded-md shadow-lg max-h-80 overflow-y-auto">
                  {suggestions.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        {t('suggestions')}
                      </div>
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            updateFilter('query', suggestion);
                            setShowSuggestionsDropdown(false);
                          }}
                        >
                          <Search className="w-3 h-3 text-muted-foreground" />
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchHistory.length > 0 && (
                    <div className="p-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        {t('recentSearches')}
                      </div>
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            updateFilter('query', item);
                            setShowSuggestionsDropdown(false);
                          }}
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.city} onValueChange={(value) => updateFilter('city', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('city')} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t('advancedFilters')}
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {t('search')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t('advancedFilters')}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t('clearAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('priceRange')}</Label>
              <div className="px-3">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilter('priceRange', value)}
                  max={1000}
                  min={0}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>{filters.priceRange[0]} {t('currency')}</span>
                  <span>{filters.priceRange[1]} {t('currency')}</span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('dateRange')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP", { locale: isRTL ? ar : undefined }) : t('startDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP", { locale: isRTL ? ar : undefined }) : t('endDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('minimumRating')}</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={filters.rating >= rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilter('rating', rating === filters.rating ? 0 : rating)}
                    className="p-2"
                  >
                    <Star className={`w-4 h-4 ${filters.rating >= rating ? 'fill-current' : ''}`} />
                  </Button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {filters.rating > 0 ? `${filters.rating}+ ${t('stars')}` : t('anyRating')}
                </span>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('difficulty')}</Label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <div key={diff.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={diff.value}
                      checked={filters.difficulty.includes(diff.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilter('difficulty', [...filters.difficulty, diff.value]);
                        } else {
                          updateFilter('difficulty', filters.difficulty.filter(d => d !== diff.value));
                        }
                      }}
                    />
                    <Label htmlFor={diff.value} className="text-sm">{diff.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('duration')}</Label>
              <Select value={filters.duration} onValueChange={(value) => updateFilter('duration', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectDuration')} />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Special Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('specialFilters')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={filters.featured}
                    onCheckedChange={(checked) => updateFilter('featured', checked)}
                  />
                  <Label htmlFor="featured" className="text-sm flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('featuredOnly')}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="instantBook"
                    checked={filters.instantBook}
                    onCheckedChange={(checked) => updateFilter('instantBook', checked)}
                  />
                  <Label htmlFor="instantBook" className="text-sm">
                    {t('instantBooking')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('sortBy')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filters.sortOrder} 
                  onValueChange={(value: 'asc' | 'desc') => updateFilter('sortOrder', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t('descending')}</SelectItem>
                    <SelectItem value="asc">{t('ascending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('activeFilters')}</span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('clearAll')}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {filters.category && (
                  <Badge variant="secondary" className="gap-1">
                    {t('category')}: {categories.find(c => c.value === filters.category)?.label}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('category')}
                    />
                  </Badge>
                )}
                
                {filters.city && (
                  <Badge variant="secondary" className="gap-1">
                    {t('city')}: {cities.find(c => c.value === filters.city)?.label}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('city')}
                    />
                  </Badge>
                )}
                
                {(filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) && (
                  <Badge variant="secondary" className="gap-1">
                    {t('price')}: {filters.priceRange[0]}-{filters.priceRange[1]} {t('currency')}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('priceRange')}
                    />
                  </Badge>
                )}
                
                {filters.rating > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {t('rating')}: {filters.rating}+ ⭐
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('rating')}
                    />
                  </Badge>
                )}
                
                {filters.difficulty.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {t('difficulty')}: {filters.difficulty.length} {t('selected')}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('difficulty')}
                    />
                  </Badge>
                )}
                
                {filters.duration && (
                  <Badge variant="secondary" className="gap-1">
                    {t('duration')}: {durations.find(d => d.value === filters.duration)?.label}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('duration')}
                    />
                  </Badge>
                )}
                
                {(filters.dateFrom || filters.dateTo) && (
                  <Badge variant="secondary" className="gap-1">
                    {t('dateRange')}: {filters.dateFrom && format(filters.dateFrom, "dd/MM/yyyy")} - {filters.dateTo && format(filters.dateTo, "dd/MM/yyyy")}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => {
                        removeFilter('dateFrom');
                        removeFilter('dateTo');
                      }}
                    />
                  </Badge>
                )}
                
                {filters.featured && (
                  <Badge variant="secondary" className="gap-1">
                    {t('featured')}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('featured')}
                    />
                  </Badge>
                )}
                
                {filters.instantBook && (
                  <Badge variant="secondary" className="gap-1">
                    {t('instantBooking')}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeFilter('instantBook')}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearchSystem;