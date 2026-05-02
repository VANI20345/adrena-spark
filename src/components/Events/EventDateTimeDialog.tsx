import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguageContext } from '@/contexts/LanguageContext';

export interface EventSchedule {
  date: Date;
  startTime: string;
  endTime: string;
  startPeriod: 'AM' | 'PM';
  endPeriod: 'AM' | 'PM';
  description?: string;
}

interface EventDateTimeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (schedules: EventSchedule[]) => void;
  initialSchedules?: EventSchedule[];
}

export const EventDateTimeDialog = ({ open, onClose, onSave, initialSchedules = [] }: EventDateTimeDialogProps) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  const [eventDate, setEventDate] = useState<Date | undefined>(
    initialSchedules[0]?.date || undefined
  );
  const [sameTimes, setSameTimes] = useState<'yes' | 'no'>('yes');
  const [schedules, setSchedules] = useState<EventSchedule[]>(
    initialSchedules.length > 0
      ? initialSchedules
      : [
          {
            date: new Date(),
            startTime: '09',
            endTime: '05',
            startPeriod: 'AM' as const,
            endPeriod: 'PM' as const,
          },
        ]
  );

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const addDay = () => {
    const lastSchedule = schedules[schedules.length - 1];
    const newDate = new Date(lastSchedule.date);
    newDate.setDate(newDate.getDate() + 1);

    setSchedules([
      ...schedules,
      {
        date: newDate,
        startTime: lastSchedule.startTime,
        endTime: lastSchedule.endTime,
        startPeriod: lastSchedule.startPeriod,
        endPeriod: lastSchedule.endPeriod,
      },
    ]);
  };

  const removeDay = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== index));
    }
  };

  const updateSchedule = (index: number, field: keyof EventSchedule, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const calculateDuration = (schedule: EventSchedule) => {
    let startHour = parseInt(schedule.startTime);
    let endHour = parseInt(schedule.endTime);

    if (schedule.startPeriod === 'PM' && startHour !== 12) startHour += 12;
    if (schedule.startPeriod === 'AM' && startHour === 12) startHour = 0;
    if (schedule.endPeriod === 'PM' && endHour !== 12) endHour += 12;
    if (schedule.endPeriod === 'AM' && endHour === 12) endHour = 0;

    let duration = endHour - startHour;
    if (duration < 0) duration += 24;

    return isRTL ? `${duration} ساعة` : `${duration} hours`;
  };

  const handleSave = () => {
    if (sameTimes === 'yes' && eventDate) {
      const schedule = schedules[0];
      onSave([{ ...schedule, date: eventDate }]);
    } else {
      onSave(schedules);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isRTL ? 'تحديد التاريخ والوقت' : 'Set Date & Time'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Date Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {isRTL ? 'تاريخ الفعالية' : 'Event Date'}
            </Label>
            <Calendar
              mode="single"
              selected={sameTimes === 'yes' ? eventDate : schedules[0]?.date}
              onSelect={(date) => {
                if (sameTimes === 'yes') {
                  setEventDate(date);
                } else {
                  updateSchedule(0, 'date', date || new Date());
                }
              }}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          {/* Same Times Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {isRTL ? 'هل أوقات الفعالية متماثلة لجميع الأيام؟' : 'Are the event times the same for all days?'}
            </Label>
            <RadioGroup value={sameTimes} onValueChange={(val) => setSameTimes(val as 'yes' | 'no')}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="cursor-pointer">
                  {isRTL ? 'نعم' : 'Yes'}
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="cursor-pointer">
                  {isRTL ? 'لا' : 'No'}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Time Schedules */}
          <div className="space-y-4">
            {schedules.map((schedule, index) => (
              <Card key={index} className="p-4 space-y-4">
                {sameTimes === 'no' && schedules.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">
                      {isRTL ? `اليوم ${index + 1}` : `Day ${index + 1}`}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDay(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {sameTimes === 'no' && (
                  <div>
                    <Label className="text-sm mb-2">{isRTL ? 'التاريخ' : 'Date'}</Label>
                    <Calendar
                      mode="single"
                      selected={schedule.date}
                      onSelect={(date) => updateSchedule(index, 'date', date || new Date())}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label>{isRTL ? 'وقت البداية' : 'Start Time'}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={schedule.startTime}
                        onValueChange={(val) => updateSchedule(index, 'startTime', val)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hours.map((hour) => (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={schedule.startPeriod}
                        onValueChange={(val) => updateSchedule(index, 'startPeriod', val as 'AM' | 'PM')}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label>{isRTL ? 'وقت النهاية' : 'End Time'}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={schedule.endTime}
                        onValueChange={(val) => updateSchedule(index, 'endTime', val)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hours.map((hour) => (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={schedule.endPeriod}
                        onValueChange={(val) => updateSchedule(index, 'endPeriod', val as 'AM' | 'PM')}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-sm text-muted-foreground">
                  {isRTL ? 'المدة: ' : 'Duration: '}
                  <span className="font-semibold">{calculateDuration(schedule)}</span>
                </div>

                {/* Day Description - Only show for multi-day events */}
                {sameTimes === 'no' && (
                  <div className="space-y-2">
                    <Label>{isRTL ? 'تفاصيل اليوم (اختياري)' : 'Day Details (optional)'}</Label>
                    <Textarea
                      value={schedule.description || ''}
                      onChange={(e) => updateSchedule(index, 'description', e.target.value)}
                      placeholder={isRTL ? 'ماذا سيحدث في هذا اليوم؟' : 'What will happen on this day?'}
                      rows={3}
                    />
                  </div>
                )}
              </Card>
            ))}

            {sameTimes === 'no' && (
              <Button type="button" variant="outline" onClick={addDay} className="w-full">
                <Plus className="h-4 w-4 ml-2" />
                {isRTL ? 'إضافة يوم آخر' : 'Add Another Day'}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave}>{isRTL ? 'حفظ التواريخ' : 'Save Dates'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
