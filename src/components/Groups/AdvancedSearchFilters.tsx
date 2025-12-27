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
import { DEFAULT_CITY } from '@/constants/defaults';

export interface GroupFilters {
  interests: string[];
  cities: string[];
  memberRange: [number, number];
  ageRange: [number, number];
  gender: string[];
}

// Default filters with Jeddah pre-selected
export const getDefaultFilters = (): GroupFilters => ({
  interests: [],
  cities: [DEFAULT_CITY.id],
  memberRange: [0, 500],
  ageRange: [18, 65],
  gender: []
});

interface AdvancedSearchFiltersProps {
  filters: GroupFilters;
  onFiltersChange: (filters: GroupFilters) => void;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const { language } = useLanguageContext();
  const [interests, setInterests] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const isRTL = language === 'ar';

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    // Query user_interests table since group_interests references it
    const { data: interestsData } = await supabase
      .from('user_interests')
      .select('id, name, name_ar')
      .order('name');
    
    const { data: citiesData } = await supabase
      .from('cities')
      .select('id, name, name_ar')
      .eq('is_active', true)
      .order('name');

    setInterests(interestsData || []);
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
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
              {interests.map((interest) => (
                <div key={interest.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`interest-${interest.id}`}
                    checked={filters.interests.includes(interest.id)}
                    onCheckedChange={() => toggleInterest(interest.id)}
                  />
                  <Label htmlFor={`interest-${interest.id}`} className="text-sm cursor-pointer">
                    {isRTL ? interest.name_ar : interest.name}
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
  );
};
