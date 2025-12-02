import React from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { AdvancedSearchFilters, GroupFilters } from './AdvancedSearchFilters';

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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
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
    </div>
  );
};
