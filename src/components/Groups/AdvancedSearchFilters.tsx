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
import { Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface GroupFilters {
  interests: string[];
  cities: string[];
  memberRange: [number, number];
  ageRange: [number, number];
  gender: string[];
}

interface AdvancedSearchFiltersProps {
  filters: GroupFilters;
  onFiltersChange: (filters: GroupFilters) => void;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
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
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, name_ar')
      .order('name');
    
    const { data: citiesData } = await supabase
      .from('cities')
      .select('id, name, name_ar')
      .eq('is_active', true)
      .order('name');

    setCategories(categoriesData || []);
    setCities(citiesData || []);
  };

  const toggleInterest = (interestId: string) => {
    const newInterests = filters.interests.includes(interestId)
      ? filters.interests.filter(id => id !== interestId)
      : [...filters.interests, interestId];
    onFiltersChange({ ...filters, interests: newInterests });
  };

  const toggleCity = (cityId: string) => {
    const newCities = filters.cities.includes(cityId)
      ? filters.cities.filter(id => id !== cityId)
      : [...filters.cities, cityId];
    onFiltersChange({ ...filters, cities: newCities });
  };

  const toggleGender = (gender: string) => {
    const newGender = filters.gender.includes(gender)
      ? filters.gender.filter(g => g !== gender)
      : [...filters.gender, gender];
    onFiltersChange({ ...filters, gender: newGender });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'interest':
        onFiltersChange({ ...filters, interests: filters.interests.filter(id => id !== value) });
        break;
      case 'city':
        onFiltersChange({ ...filters, cities: filters.cities.filter(id => id !== value) });
        break;
      case 'gender':
        onFiltersChange({ ...filters, gender: filters.gender.filter(g => g !== value) });
        break;
      case 'memberRange':
        onFiltersChange({ ...filters, memberRange: [0, 500] });
        break;
      case 'ageRange':
        onFiltersChange({ ...filters, ageRange: [18, 65] });
        break;
    }
  };

  const clearAll = () => {
    onFiltersChange({
      interests: [],
      cities: [],
      memberRange: [0, 500],
      ageRange: [18, 65],
      gender: []
    });
  };

  const hasActiveFilters = 
    filters.interests.length > 0 ||
    filters.cities.length > 0 ||
    filters.gender.length > 0 ||
    filters.memberRange[0] !== 0 ||
    filters.memberRange[1] !== 500 ||
    filters.ageRange[0] !== 18 ||
    filters.ageRange[1] !== 65;

  return (
    <div className="space-y-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            {isRTL ? 'تصفية' : 'Filter'}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {filters.interests.length + filters.cities.length + filters.gender.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            {/* Interests */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {isRTL ? 'الاهتمامات' : 'Interests'}
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`interest-${cat.id}`}
                      checked={filters.interests.includes(cat.id)}
                      onCheckedChange={() => toggleInterest(cat.id)}
                    />
                    <Label htmlFor={`interest-${cat.id}`} className="text-sm cursor-pointer">
                      {isRTL ? cat.name_ar : cat.name}
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

            {/* Member Count */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {isRTL ? 'عدد الأعضاء' : 'Member Count'}: {filters.memberRange[0]} - {filters.memberRange[1]}
              </Label>
              <Slider
                value={filters.memberRange}
                onValueChange={(val) => onFiltersChange({ ...filters, memberRange: val as [number, number] })}
                min={0}
                max={500}
                step={10}
                className="mt-2"
              />
            </div>

            {/* Age Range */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {isRTL ? 'الفئة العمرية' : 'Age Range'}: {filters.ageRange[0]} - {filters.ageRange[1]}
              </Label>
              <Slider
                value={filters.ageRange}
                onValueChange={(val) => onFiltersChange({ ...filters, ageRange: val as [number, number] })}
                min={18}
                max={65}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Gender */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                {isRTL ? 'الجنس' : 'Gender'}
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gender-male"
                    checked={filters.gender.includes('male')}
                    onCheckedChange={() => toggleGender('male')}
                  />
                  <Label htmlFor="gender-male" className="text-sm cursor-pointer">
                    {isRTL ? 'ذكور' : 'Male'}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gender-female"
                    checked={filters.gender.includes('female')}
                    onCheckedChange={() => toggleGender('female')}
                  />
                  <Label htmlFor="gender-female" className="text-sm cursor-pointer">
                    {isRTL ? 'إناث' : 'Female'}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gender-both"
                    checked={filters.gender.includes('both')}
                    onCheckedChange={() => toggleGender('both')}
                  />
                  <Label htmlFor="gender-both" className="text-sm cursor-pointer">
                    {isRTL ? 'كلاهما' : 'Both'}
                  </Label>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
                {isRTL ? 'مسح الكل' : 'Clear All'}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 max-w-2xl">
          {filters.interests.map((id) => {
            const cat = categories.find(c => c.id === id);
            return cat ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs py-1 px-2">
                {isRTL ? cat.name_ar : cat.name}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('interest', id)}
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
          {filters.gender.map((g) => (
            <Badge key={g} variant="secondary" className="gap-1 text-xs py-1 px-2">
              {isRTL ? (g === 'male' ? 'ذكور' : g === 'female' ? 'إناث' : 'كلاهما') : g}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('gender', g)}
              />
            </Badge>
          ))}
          {(filters.memberRange[0] !== 0 || filters.memberRange[1] !== 500) && (
            <Badge variant="secondary" className="gap-1 text-xs py-1 px-2">
              {isRTL ? 'أعضاء' : 'Members'}: {filters.memberRange[0]}-{filters.memberRange[1]}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('memberRange')}
              />
            </Badge>
          )}
          {(filters.ageRange[0] !== 18 || filters.ageRange[1] !== 65) && (
            <Badge variant="secondary" className="gap-1 text-xs py-1 px-2">
              {isRTL ? 'عمر' : 'Age'}: {filters.ageRange[0]}-{filters.ageRange[1]}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('ageRange')}
              />
            </Badge>
          )}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAll} 
              className="h-7 text-xs px-2"
            >
              {isRTL ? 'مسح الكل' : 'Clear All'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
