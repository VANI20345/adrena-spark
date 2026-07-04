import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface TimeSlot {
  start: string;
  end: string;
  isBooked: boolean;
}

interface TimeSlotSelectorProps {
  serviceId: string;
  selectedDate: Date | undefined;
  availabilityType: string;
  availableFrom: string;
  availableTo: string;
  bookingDuration: number;
  onSlotSelect: (slot: { start: string; end: string } | null) => void;
  selectedSlot: { start: string; end: string } | null;
}

const TimeSlotSelector = ({
  serviceId,
  selectedDate,
  availabilityType,
  availableFrom,
  availableTo,
  bookingDuration,
  onSlotSelect,
  selectedSlot
}: TimeSlotSelectorProps) => {
  const { t } = useLanguageContext();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDate, serviceId]);

  const generateTimeSlots = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      // Determine start and end times
      let startHour = 0;
      let endHour = 24;
      
      if (availabilityType !== 'full_day') {
        const fromParts = availableFrom.split(':');
        const toParts = availableTo.split(':');
        startHour = parseInt(fromParts[0], 10);
        endHour = parseInt(toParts[0], 10);
      }

      // Generate time slots based on booking duration
      const slots: TimeSlot[] = [];
      const durationMinutes = bookingDuration || 60;
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += durationMinutes) {
          if (hour * 60 + minute + durationMinutes > endHour * 60) break;
          
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endMinutes = (hour * 60 + minute + durationMinutes);
          const endHr = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          const endTime = `${endHr.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          slots.push({
            start: startTime,
            end: endTime,
            isBooked: false
          });
        }
      }

      // Fetch existing bookings for this date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: bookings, error } = await supabase
        .from('service_bookings')
        .select('start_time, end_time')
        .eq('service_id', serviceId)
        .eq('service_date', dateStr)
        .in('status', ['pending', 'pending_payment', 'confirmed']);

      if (error) {
        console.error('Error fetching bookings:', error);
      }

      // Mark booked slots
      if (bookings && bookings.length > 0) {
        slots.forEach(slot => {
          bookings.forEach(booking => {
            if (booking.start_time && booking.end_time) {
              const bookingStart = booking.start_time.substring(0, 5);
              const bookingEnd = booking.end_time.substring(0, 5);
              
              // Check for overlap
              if (slot.start < bookingEnd && slot.end > bookingStart) {
                slot.isBooked = true;
              }
            }
          });
        });
      }

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isBooked) return;
    
    if (selectedSlot?.start === slot.start && selectedSlot?.end === slot.end) {
      onSlotSelect(null);
    } else {
      onSlotSelect({ start: slot.start, end: slot.end });
    }
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {t('serviceBooking.selectDateFirst')}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  const availableSlots = timeSlots.filter(s => !s.isBooked);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('serviceBooking.availableSlots')}
        </h4>
        <Badge variant="secondary">
          {availableSlots.length} {t('serviceBooking.available')}
        </Badge>
      </div>

      {timeSlots.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          {t('serviceBooking.noSlotsAvailable')}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {timeSlots.map((slot, index) => (
            <Button
              key={index}
              variant={
                selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
                  ? "default"
                  : slot.isBooked
                  ? "outline"
                  : "secondary"
              }
              size="sm"
              disabled={slot.isBooked}
              onClick={() => handleSlotClick(slot)}
              className={`text-xs ${slot.isBooked ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
            >
              {slot.start}
            </Button>
          ))}
        </div>
      )}

      {selectedSlot && (
        <div className="bg-primary/10 rounded-lg p-3 text-sm">
          <span className="font-medium">{t('serviceBooking.selectedTime')}: </span>
          {selectedSlot.start} - {selectedSlot.end}
        </div>
      )}
    </div>
  );
};

export default TimeSlotSelector;
