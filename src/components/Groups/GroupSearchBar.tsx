import React, { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { AdvancedSearchFilters, GroupFilters } from './AdvancedSearchFilters';
import { supabase } from '@/integrations/supabase/client';

interface GroupSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: GroupFilters;
  onFiltersChange: (filters: GroupFilters) => void;
}

export const GroupSearchBar: React.FC<GroupSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [interests, setInterests] = useState<{ id: string; name: string; name_ar: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; name_ar: string }[]>([]);

  // Fetch interests and cities for badge display
  useEffect(() => {
    const loadOptions = async () => {
      const [interestsRes, citiesRes] = await Promise.all([
        supabase.from('user_interests').select('id, name, name_ar').order('name'),
        supabase.from('cities').select('id, name, name_ar').eq('is_active', true).order('name')
      ]);
      setInterests(interestsRes.data || []);
      setCities(citiesRes.data || []);
    };
    loadOptions();
  }, []);

  const hasActiveFilters = 
    filters.interests.length > 0 ||
    filters.cities.length > 0 ||
    filters.gender.length > 0 ||
    filters.memberRange[0] !== 0 ||
    filters.memberRange[1] !== 500 ||
    filters.ageRange[0] !== 18 ||
    filters.ageRange[1] !== 65;

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

  return (
    <div className="space-y-3">
      {/* Search Row - Fixed layout */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            type="text"
            placeholder={isRTL ? 'ابحث عن المجموعات...' : 'Search groups...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>
        <AdvancedSearchFilters filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      {/* Active Filters Display - Separate row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/50 rounded-lg">
          {filters.interests.map((id) => {
            const interest = interests.find(i => i.id === id);
            return interest ? (
              <Badge key={id} variant="secondary" className="gap-1 text-xs py-1 px-2">
                {isRTL ? interest.name_ar : interest.name}
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
