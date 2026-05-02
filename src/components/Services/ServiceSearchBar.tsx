import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { ServiceFilters, ServiceAdvancedFilters } from './ServiceAdvancedFilters';
import { supabase } from '@/integrations/supabase/client';

interface ServiceSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: ServiceFilters;
  onFiltersChange: (filters: ServiceFilters) => void;
}

export const ServiceSearchBar: React.FC<ServiceSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [categories, setCategories] = useState<{ id: string; name: string; name_ar: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; name_ar: string }[]>([]);

  // Fetch categories and cities for badge display
  useEffect(() => {
    const loadOptions = async () => {
      const [categoriesRes, citiesRes] = await Promise.all([
        supabase.from('service_categories').select('id, name, name_ar').eq('is_active', true).order('display_order'),
        supabase.from('cities').select('id, name, name_ar').eq('is_active', true).order('name')
      ]);
      setCategories(categoriesRes.data || []);
      setCities(citiesRes.data || []);
    };
    loadOptions();
  }, []);

  const hasActiveFilters = 
    filters.categories.length > 0 ||
    filters.cities.length > 0 ||
    filters.serviceTypes.length > 0 ||
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 5000;

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'category':
        onFiltersChange({ ...filters, categories: filters.categories.filter(id => id !== value) });
        break;
      case 'city':
        onFiltersChange({ ...filters, cities: filters.cities.filter(id => id !== value) });
        break;
      case 'serviceType':
        onFiltersChange({ ...filters, serviceTypes: filters.serviceTypes.filter(t => t !== value) });
        break;
      case 'priceRange':
        onFiltersChange({ ...filters, priceRange: [0, 5000] });
        break;
    }
  };

  const clearAll = () => {
    onFiltersChange({
      categories: [],
      cities: [],
      priceRange: [0, 5000],
      serviceTypes: []
    });
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'training': return isRTL ? 'تدريب' : 'Training';
      case 'discount': return isRTL ? 'خصم' : 'Discount';
      case 'other': return isRTL ? 'خدمة' : 'Service';
      default: return type;
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Row */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            type="text"
            placeholder={isRTL ? 'ابحث عن الخدمات...' : 'Search services...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>
        <ServiceAdvancedFilters filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/50 rounded-lg">
          {filters.categories.map((id) => {
            const category = categories.find(c => c.id === id);
            return category ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs py-1 px-2">
                {isRTL ? category.name_ar : category.name}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('category', id)}
                />
              </Badge>
            ) : null;
          })}
          {filters.cities.map((id) => {
            const city = cities.find(c => c.id === id);
            return city ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs py-1 px-2">
                {isRTL ? city.name_ar : city.name}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('city', id)}
                />
              </Badge>
            ) : null;
          })}
          {filters.serviceTypes.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1 text-xs py-1 px-2">
              {getServiceTypeLabel(type)}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('serviceType', type)}
              />
            </Badge>
          ))}
          {(filters.priceRange[0] !== 0 || filters.priceRange[1] !== 5000) && (
            <Badge variant="secondary" className="gap-1 text-xs py-1 px-2">
              {isRTL ? 'السعر' : 'Price'}: {filters.priceRange[0]}-{filters.priceRange[1]} {isRTL ? 'ريال' : 'SAR'}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('priceRange')}
              />
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAll} 
            className="h-7 text-xs px-2"
          >
            {isRTL ? 'مسح الكل' : 'Clear All'}
          </Button>
        </div>
      )}
    </div>
  );
};
