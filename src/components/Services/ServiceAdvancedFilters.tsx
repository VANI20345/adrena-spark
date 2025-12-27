import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_CITY } from '@/constants/defaults';

export interface ServiceFilters {
  categories: string[];
  cities: string[];
  priceRange: [number, number];
  serviceTypes: string[];
}

// Default filters with Jeddah pre-selected
export const getDefaultServiceFilters = (): ServiceFilters => ({
  categories: [],
  cities: [DEFAULT_CITY.id],
  priceRange: [0, 5000],
  serviceTypes: []
});

interface ServiceAdvancedFiltersProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: ServiceFilters) => void;
}

export const ServiceAdvancedFilters: React.FC<ServiceAdvancedFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const { language } = useLanguageContext();
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const [categoriesRes, citiesRes] = await Promise.all([
      supabase.from('service_categories').select('id, name, name_ar').eq('is_active', true).order('display_order'),
      supabase.from('cities').select('id, name, name_ar').eq('is_active', true).order('name')
    ]);
    
    setCategories(categoriesRes.data || []);
    setCities(citiesRes.data || []);
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleCity = (cityId: string) => {
    const newCities = filters.cities.includes(cityId)
      ? filters.cities.filter(id => id !== cityId)
      : [...filters.cities, cityId];
    onFiltersChange({ ...filters, cities: newCities });
  };

  const toggleServiceType = (type: string) => {
    const newTypes = filters.serviceTypes.includes(type)
      ? filters.serviceTypes.filter(t => t !== type)
      : [...filters.serviceTypes, type];
    onFiltersChange({ ...filters, serviceTypes: newTypes });
  };

  const clearAll = () => {
    onFiltersChange({
      categories: [],
      cities: [],
      priceRange: [0, 5000],
      serviceTypes: []
    });
  };

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.cities.length > 0 ||
    filters.serviceTypes.length > 0 ||
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 5000;

  const serviceTypes = [
    { value: 'other', labelAr: 'خدمات', labelEn: 'Services' },
    { value: 'training', labelAr: 'تدريبات', labelEn: 'Training' },
    { value: 'discount', labelAr: 'خصومات', labelEn: 'Discounts' }
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <Filter className="w-4 h-4" />
          {isRTL ? 'تصفية' : 'Filter'}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {filters.categories.length + filters.cities.length + filters.serviceTypes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          {/* Service Type */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              {isRTL ? 'نوع الخدمة' : 'Service Type'}
            </Label>
            <div className="space-y-2">
              {serviceTypes.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.serviceTypes.includes(type.value)}
                    onCheckedChange={() => toggleServiceType(type.value)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer">
                    {isRTL ? type.labelAr : type.labelEn}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              {isRTL ? 'التصنيف' : 'Category'}
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">
                    {isRTL ? category.name_ar : category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              {isRTL ? 'المدينة' : 'City'}
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cities.map((city) => (
                <div key={city.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`city-${city.id}`}
                    checked={filters.cities.includes(city.id)}
                    onCheckedChange={() => toggleCity(city.id)}
                  />
                  <Label htmlFor={`city-${city.id}`} className="text-sm cursor-pointer">
                    {isRTL ? city.name_ar : city.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              {isRTL ? 'نطاق السعر' : 'Price Range'}: {filters.priceRange[0]} - {filters.priceRange[1]} {isRTL ? 'ريال' : 'SAR'}
            </Label>
            <Slider
              value={filters.priceRange}
              onValueChange={(val) => onFiltersChange({ ...filters, priceRange: val as [number, number] })}
              min={0}
              max={5000}
              step={50}
              className="mt-2"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
              {isRTL ? 'مسح الكل' : 'Clear All'}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
