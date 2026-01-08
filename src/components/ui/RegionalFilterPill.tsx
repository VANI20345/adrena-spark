import React from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface RegionalFilterPillProps {
  cityName: string;
  cityNameAr?: string;
  isActive: boolean;
  onClear: () => void;
  onChange?: () => void;
  className?: string;
}

export const RegionalFilterPill: React.FC<RegionalFilterPillProps> = ({
  cityName,
  cityNameAr,
  isActive,
  onClear,
  onChange,
  className
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const displayName = isRTL ? (cityNameAr || cityName) : cityName;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-primary/10 border border-primary/20 text-primary",
          "text-sm font-medium",
          className
        )}
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>
          {isRTL ? 'عرض النتائج في' : 'Showing results in'} {displayName}
        </span>
        
        <div className="flex items-center gap-1 border-l border-primary/20 pl-2 ml-1">
          {onChange && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs hover:bg-primary/20"
              onClick={onChange}
            >
              {isRTL ? 'تغيير' : 'Change'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-primary/20 rounded-full"
            onClick={onClear}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Jeddah-specific default filter component
interface JeddahDefaultFilterProps {
  isActive: boolean;
  onClear: () => void;
  onChange?: () => void;
}

export const JeddahDefaultFilter: React.FC<JeddahDefaultFilterProps> = ({
  isActive,
  onClear,
  onChange
}) => {
  return (
    <RegionalFilterPill
      cityName="Jeddah"
      cityNameAr="جدة"
      isActive={isActive}
      onClear={onClear}
      onChange={onChange}
    />
  );
};