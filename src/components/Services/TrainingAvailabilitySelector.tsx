import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Infinity } from "lucide-react";
import { useLanguageContext } from "@/contexts/LanguageContext";

interface TrainingAvailabilitySelectorProps {
  availableFrom: string;
  availableTo: string | null;
  availableForever: boolean;
  onFromChange: (date: string) => void;
  onToChange: (date: string | null) => void;
  onForeverChange: (forever: boolean) => void;
}

export default function TrainingAvailabilitySelector({
  availableFrom,
  availableTo,
  availableForever,
  onFromChange,
  onToChange,
  onForeverChange,
}: TrainingAvailabilitySelectorProps) {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  const handleForeverToggle = (checked: boolean) => {
    onForeverChange(checked);
    if (checked) {
      onToChange(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-primary" />
        <Label className="font-medium">
          {isRTL ? 'فترة الإتاحة' : 'Availability Period'}
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="available_from">
            {isRTL ? 'تاريخ البدء' : 'Start Date'}
          </Label>
          <Input
            id="available_from"
            type="date"
            value={availableFrom}
            onChange={(e) => onFromChange(e.target.value)}
            min={today}
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="available_to" className={availableForever ? 'text-muted-foreground' : ''}>
            {isRTL ? 'تاريخ الانتهاء' : 'End Date'}
          </Label>
          <Input
            id="available_to"
            type="date"
            value={availableTo || ''}
            onChange={(e) => onToChange(e.target.value || null)}
            min={availableFrom || today}
            disabled={availableForever}
            className={availableForever ? 'opacity-50' : ''}
          />
        </div>
      </div>

      {/* Forever Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Infinity className="w-4 h-4 text-primary" />
          <div>
            <Label htmlFor="available_forever" className="font-medium cursor-pointer">
              {isRTL ? 'متاح للأبد' : 'Available Forever'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isRTL 
                ? 'بدون تاريخ انتهاء محدد'
                : 'No specific end date'}
            </p>
          </div>
        </div>
        <Switch
          id="available_forever"
          checked={availableForever}
          onCheckedChange={handleForeverToggle}
        />
      </div>

      {/* Summary */}
      {availableFrom && (
        <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-md">
          {isRTL ? (
            <>
              الخدمة متاحة من <strong>{availableFrom}</strong>
              {availableForever 
                ? ' وحتى إشعار آخر' 
                : availableTo 
                  ? <> حتى <strong>{availableTo}</strong></>
                  : ' (يرجى تحديد تاريخ الانتهاء)'}
            </>
          ) : (
            <>
              Service available from <strong>{availableFrom}</strong>
              {availableForever 
                ? ' indefinitely' 
                : availableTo 
                  ? <> until <strong>{availableTo}</strong></>
                  : ' (please set an end date)'}
            </>
          )}
        </div>
      )}
    </div>
  );
}