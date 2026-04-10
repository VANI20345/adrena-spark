import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Clock } from "lucide-react";
import { useLanguageContext } from "@/contexts/LanguageContext";

export interface WeeklySchedule {
  sunday: string[];
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
}

interface WeeklyScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  sessionDurationMinutes?: number;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DAY_LABELS = {
  en: {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  },
  ar: {
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
  }
};

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

export default function WeeklyScheduleEditor({ 
  schedule, 
  onChange,
  sessionDurationMinutes = 60 
}: WeeklyScheduleEditorProps) {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const labels = DAY_LABELS[language] || DAY_LABELS.en;
  
  const [newTimes, setNewTimes] = useState<Record<string, string>>({});

  const handleAddSlot = (day: keyof WeeklySchedule) => {
    const time = newTimes[day];
    if (!time) return;
    
    // Check if time already exists
    if (schedule[day].includes(time)) {
      return;
    }
    
    // Add and sort times
    const updatedSlots = [...schedule[day], time].sort();
    onChange({
      ...schedule,
      [day]: updatedSlots
    });
    
    // Clear the input
    setNewTimes({ ...newTimes, [day]: '' });
  };

  const handleRemoveSlot = (day: keyof WeeklySchedule, time: string) => {
    onChange({
      ...schedule,
      [day]: schedule[day].filter(t => t !== time)
    });
  };

  const getTotalSlots = () => {
    return DAYS.reduce((sum, day) => sum + (schedule[day]?.length || 0), 0);
  };

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {isRTL ? 'جدول الجلسات الأسبوعي' : 'Weekly Session Schedule'}
        </h3>
        <Badge variant="secondary">
          {getTotalSlots()} {isRTL ? 'جلسة أسبوعياً' : 'sessions/week'}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {isRTL 
          ? 'حدد أوقات الجلسات لكل يوم. ستتكرر هذه المواعيد أسبوعياً.'
          : 'Set session times for each day. These times will repeat weekly.'}
      </p>

      <div className="space-y-3">
        {DAYS.map((day) => (
          <Card key={day} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-base">
                    {labels[day]}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {schedule[day]?.length || 0} {isRTL ? 'جلسات' : 'slots'}
                  </Badge>
                </div>

                {/* Existing time slots */}
                {schedule[day]?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {schedule[day].map((time) => (
                      <Badge 
                        key={time} 
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1.5"
                      >
                        <span>{to12Hour(time)}</span>
                        {sessionDurationMinutes > 0 && (
                          <span className="text-xs text-muted-foreground">
                            → {to12Hour(addMinutes(time, sessionDurationMinutes))}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(day, time)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add new time slot */}
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newTimes[day] || ''}
                    onChange={(e) => setNewTimes({ ...newTimes, [day]: e.target.value })}
                    className="w-32"
                    placeholder="00:00"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSlot(day)}
                    disabled={!newTimes[day]}
                  >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {getTotalSlots() === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
          {isRTL 
            ? 'يجب إضافة موعد واحد على الأقل لكي يتمكن العملاء من الحجز.'
            : 'You must add at least one time slot for customers to book.'}
        </p>
      )}
    </div>
  );
}
