import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Timer, Info } from 'lucide-react';

const SETTING_KEY = 'payment_hold_duration_hours';
const DEFAULT_HOURS = 72;

export const HoldDurationSettings: React.FC = () => {
  const { isRTL } = useLanguageContext();
  const qc = useQueryClient();
  const [value, setValue] = useState<number>(DEFAULT_HOURS);
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');
  const [saving, setSaving] = useState(false);

  const { data: currentHours } = useQuery({
    queryKey: ['payment_hold_duration_hours'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      const raw = (data?.value as any);
      const hrs = Number(typeof raw === 'object' && raw !== null ? raw.hours : raw) || DEFAULT_HOURS;
      return hrs;
    },
  });

  useEffect(() => {
    if (typeof currentHours === 'number') {
      if (currentHours % 24 === 0 && currentHours >= 24) {
        setValue(currentHours / 24);
        setUnit('days');
      } else {
        setValue(currentHours);
        setUnit('hours');
      }
    }
  }, [currentHours]);

  const handleSave = async () => {
    const hours = unit === 'days' ? Math.round(value * 24) : Math.round(value);
    if (!hours || hours < 1) {
      toast.error(isRTL ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid value');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { key: SETTING_KEY, value: { hours } as any },
          { onConflict: 'key' }
        );
      if (error) throw error;
      toast.success(isRTL ? 'تم حفظ مدة الاحتجاز' : 'Hold duration saved');
      qc.invalidateQueries({ queryKey: ['payment_hold_duration_hours'] });
    } catch (err: any) {
      console.error(err);
      toast.error(
        isRTL
          ? 'تعذّر الحفظ. تأكد من صلاحيات النظام.'
          : `Could not save: ${err?.message || 'permission error'}`
      );
    } finally {
      setSaving(false);
    }
  };

  const displayHours = currentHours ?? DEFAULT_HOURS;
  const displayText =
    displayHours % 24 === 0 && displayHours >= 24
      ? `${displayHours / 24} ${isRTL ? 'يوم' : 'day(s)'}`
      : `${displayHours} ${isRTL ? 'ساعة' : 'hour(s)'}`;

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          {isRTL ? 'مدة احتجاز الأموال' : 'Payment Hold Duration'}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'مدة احتجاز أموال مقدمي الخدمة قبل الإفراج عنها.'
            : 'How long provider funds are held before they become releasable.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'المدة الحالية:' : 'Currently active:'}
          </p>
          <p className="text-2xl font-bold text-primary">{displayText}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>{isRTL ? 'القيمة' : 'Value'}</Label>
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? 'الوحدة' : 'Unit'}</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as 'hours' | 'days')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">{isRTL ? 'ساعات' : 'Hours'}</SelectItem>
                <SelectItem value="days">{isRTL ? 'أيام' : 'Days'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {isRTL
              ? 'يُطبَّق هذا التغيير على المعاملات الجديدة فقط. الحجوزات والمعاملات السابقة تحتفظ بمدد الاحتجاز الأصلية.'
              : 'This change applies to new transactions only. Existing holds keep their original release times.'}
          </AlertDescription>
        </Alert>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save Hold Duration')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HoldDurationSettings;