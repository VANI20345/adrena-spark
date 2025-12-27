import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SuspensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, durationDays?: number) => void;
  userName: string;
}

export const SuspensionDialog = ({ open, onOpenChange, onConfirm, userName }: SuspensionDialogProps) => {
  const [reason, setReason] = useState('');
  const [durationType, setDurationType] = useState<'permanent' | '7' | '30' | '90' | 'custom'>('7');
  const [customDate, setCustomDate] = useState<Date>();

  const handleConfirm = () => {
    if (!reason.trim()) return;

    let durationDays: number | undefined;
    
    if (durationType === 'permanent') {
      durationDays = undefined;
    } else if (durationType === 'custom' && customDate) {
      const diffTime = customDate.getTime() - new Date().getTime();
      durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      durationDays = parseInt(durationType);
    }

    onConfirm(reason, durationDays);
    setReason('');
    setDurationType('7');
    setCustomDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعليق حساب {userName}</DialogTitle>
          <DialogDescription>
            حدد سبب التعليق ومدته
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب التعليق *</Label>
            <Textarea
              id="reason"
              placeholder="اكتب سبب التعليق..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">مدة التعليق</Label>
            <Select value={durationType} onValueChange={(value: any) => setDurationType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المدة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 أيام</SelectItem>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="90">90 يوم</SelectItem>
                <SelectItem value="custom">تاريخ مخصص</SelectItem>
                <SelectItem value="permanent">دائم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {durationType === 'custom' && (
            <div className="space-y-2">
              <Label>تاريخ الانتهاء</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !customDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {customDate ? format(customDate, "PPP") : <span>اختر التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            تعليق الحساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
