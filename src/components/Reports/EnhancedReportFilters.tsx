import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface EnhancedReportFiltersProps {
  selectedYear: number;
  selectedMonth: number | null;
  selectedDay: Date | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | null) => void;
  onDayChange: (day: Date | null) => void;
  onApplyFilters: () => void;
}

export const EnhancedReportFilters: React.FC<EnhancedReportFiltersProps> = ({
  selectedYear,
  selectedMonth,
  selectedDay,
  onYearChange,
  onMonthChange,
  onDayChange,
  onApplyFilters
}) => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 1, label: t('admin.reports.january') },
    { value: 2, label: t('admin.reports.february') },
    { value: 3, label: t('admin.reports.march') },
    { value: 4, label: t('admin.reports.april') },
    { value: 5, label: t('admin.reports.may') },
    { value: 6, label: t('admin.reports.june') },
    { value: 7, label: t('admin.reports.july') },
    { value: 8, label: t('admin.reports.august') },
    { value: 9, label: t('admin.reports.september') },
    { value: 10, label: t('admin.reports.october') },
    { value: 11, label: t('admin.reports.november') },
    { value: 12, label: t('admin.reports.december') }
  ];

  return (
    <div className={`flex flex-wrap items-end gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Year Selector */}
      <div className={`flex-1 min-w-[150px] ${isRTL ? 'text-right' : 'text-left'}`}>
        <label className="text-sm font-medium mb-2 block">{t('admin.reports.year')}</label>
        <Select 
          value={selectedYear.toString()} 
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('admin.reports.selectYear')} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month Selector */}
      <div className={`flex-1 min-w-[150px] ${isRTL ? 'text-right' : 'text-left'}`}>
        <label className="text-sm font-medium mb-2 block">{t('admin.reports.month')} ({t('admin.reports.optional')})</label>
        <Select 
          value={selectedMonth?.toString() || 'all'} 
          onValueChange={(value) => onMonthChange(value === 'all' ? null : parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('admin.reports.allMonths')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.reports.allMonths')}</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Day Selector */}
      <div className={`flex-1 min-w-[180px] ${isRTL ? 'text-right' : 'text-left'}`}>
        <label className="text-sm font-medium mb-2 block">{t('admin.reports.day')} ({t('admin.reports.optional')})</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                `w-full font-normal ${isRTL ? 'justify-start text-right' : 'justify-start text-left'}`,
                !selectedDay && "text-muted-foreground"
              )}
            >
              <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {selectedDay ? format(selectedDay, "PPP", { locale: isRTL ? ar : undefined }) : t('admin.reports.selectSpecificDay')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDay || undefined}
              onSelect={(date) => onDayChange(date || null)}
              initialFocus
              className="pointer-events-auto"
            />
            {selectedDay && (
              <div className="p-3 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => onDayChange(null)}
                >
                  {t('admin.reports.clearSelection')}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Apply Button */}
      <Button onClick={onApplyFilters} className="min-w-[120px]">
        {t('admin.reports.applyFilter')}
      </Button>
    </div>
  );
};
