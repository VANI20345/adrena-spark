import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertCircle } from "lucide-react";
import { format, getDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageContext } from "@/contexts/LanguageContext";

interface WeeklySchedule {
  sunday?: string[];
  monday?: string[];
  tuesday?: string[];
  wednesday?: string[];
  thursday?: string[];
  friday?: string[];
  saturday?: string[];
}

interface TrainingSlotSelectorProps {
  serviceId: string;
  selectedDate: Date | undefined;
  weeklySchedule: WeeklySchedule;
  availableFrom: string | null;
  availableTo: string | null;
  availableForever: boolean;
  maxCapacity: number;
  sessionDurationMinutes: number;
  selectedSlot: string | null;
  onSelectSlot: (slot: string | null) => void;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// Helper to convert 24h to 12h format
const to12Hour = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper to add minutes to time
const addMinutes = (time24: string, mins: number): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + mins;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};

export default function TrainingSlotSelector({
  serviceId,
  selectedDate,
  weeklySchedule,
  availableFrom,
  availableTo,
  availableForever,
  maxCapacity,
  sessionDurationMinutes,
  selectedSlot,
  onSelectSlot,
}: TrainingSlotSelectorProps) {
  const { language, t } = useLanguageContext();
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});

  // Check if date is within availability range
  const isDateInRange = useMemo(() => {
    if (!selectedDate) return false;
    
    const dateToCheck = startOfDay(selectedDate);
    
    if (availableFrom) {
      const fromDate = startOfDay(parseISO(availableFrom));
      if (isBefore(dateToCheck, fromDate)) return false;
    }
    
    if (!availableForever && availableTo) {
      const toDate = startOfDay(parseISO(availableTo));
      if (isAfter(dateToCheck, toDate)) return false;
    }
    
    return true;
  }, [selectedDate, availableFrom, availableTo, availableForever]);

  // Get available slots for the selected date based on day of week
  const availableSlots = useMemo(() => {
    if (!selectedDate || !isDateInRange) return [];
    
    const dayIndex = getDay(selectedDate);
    const dayName = DAY_NAMES[dayIndex];
    
    return weeklySchedule[dayName] || [];
  }, [selectedDate, weeklySchedule, isDateInRange]);

  // Fetch existing bookings for the selected date
  useEffect(() => {
    const fetchBookings = async () => {
      if (!selectedDate || !serviceId) return;
      
      setLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('service_bookings')
          .select('start_time, quantity')
          .eq('service_id', serviceId)
          .eq('service_date', dateStr)
          .in('status', ['pending', 'pending_payment', 'confirmed']);

        if (error) throw error;

        // Count total quantity booked per time slot
        const slotCounts: Record<string, number> = {};
        (data || []).forEach(booking => {
          const time = booking.start_time?.slice(0, 5) || '';
          const qty = booking.quantity || 1;
          slotCounts[time] = (slotCounts[time] || 0) + qty;
        });
        
        setBookedSlots(slotCounts);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setBookedSlots({});
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [selectedDate, serviceId]);

  // Check if a slot is fully booked
  const isSlotFullyBooked = (time: string): boolean => {
    const booked = bookedSlots[time] || 0;
    return booked >= maxCapacity;
  };

  // Get remaining spots for a slot
  const getRemainingSpots = (time: string): number => {
    const booked = bookedSlots[time] || 0;
    return Math.max(0, maxCapacity - booked);
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{isRTL ? 'اختر تاريخاً لعرض المواعيد المتاحة' : 'Select a date to view available slots'}</p>
      </div>
    );
  }

  if (!isDateInRange) {
    return (
      <div className="text-center py-6 text-amber-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>{isRTL ? 'التاريخ المحدد خارج فترة الإتاحة' : 'Selected date is outside availability period'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Label>{isRTL ? 'جاري تحميل المواعيد...' : 'Loading slots...'}</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{isRTL ? 'لا توجد جلسات متاحة في هذا اليوم' : 'No sessions available on this day'}</p>
        <p className="text-xs mt-1">
          {isRTL ? 'المدرب لم يحدد مواعيد لهذا اليوم' : 'The trainer has not scheduled sessions for this day'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <Label className="font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {isRTL ? 'المواعيد المتاحة' : 'Available Sessions'}
        </Label>
        <Badge variant="outline">
          {availableSlots.filter(s => !isSlotFullyBooked(s)).length} {isRTL ? 'متاح' : 'available'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableSlots.map((time) => {
          const isFullyBooked = isSlotFullyBooked(time);
          const remainingSpots = getRemainingSpots(time);
          const isSelected = selectedSlot === time;
          const endTime = addMinutes(time, sessionDurationMinutes);

          return (
            <button
              key={time}
              type="button"
              disabled={isFullyBooked}
              onClick={() => onSelectSlot(isSelected ? null : time)}
              className={`
                relative px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                ${isFullyBooked 
                  ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50 line-through' 
                  : isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-card text-card-foreground border-border hover:border-primary hover:bg-primary/5'
                }
              `}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span>{to12Hour(time)}</span>
                <span className="text-xs opacity-75">→ {to12Hour(endTime)}</span>
              </div>
              
              {!isFullyBooked && (
                <Badge 
                  variant={remainingSpots <= 2 ? 'destructive' : 'secondary'} 
                  className="absolute -top-2 -right-2 text-[10px] px-1.5"
                >
                  {remainingSpots}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {selectedSlot && (
        <div className="p-3 bg-primary/10 rounded-lg text-sm">
          <p className="font-medium">
            {isRTL ? 'الموعد المحدد:' : 'Selected slot:'}
          </p>
          <p>
            {to12Hour(selectedSlot)} → {to12Hour(addMinutes(selectedSlot, sessionDurationMinutes))}
            <span className="text-muted-foreground ml-2">
              ({sessionDurationMinutes} {isRTL ? 'دقيقة' : 'min'})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}