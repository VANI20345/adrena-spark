import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Receipt } from 'lucide-react';

/**
 * Super Admin — Platform VAT / ZATCA settings
 * Stores `platform_vat_number` and `platform_name` in `system_settings`.
 */
export default function PlatformVATSettings() {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();

  const [vatNumber, setVatNumber] = useState('');
  const [platformName, setPlatformName] = useState('Hawaya');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['platform_vat_number', 'platform_name']);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach((r: any) => { map[r.key] = r.value; });
      setVatNumber(typeof map.platform_vat_number === 'string' ? map.platform_vat_number : (map.platform_vat_number?.value ?? ''));
      setPlatformName(typeof map.platform_name === 'string' ? map.platform_name : (map.platform_name?.value ?? 'Hawaya'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from('system_settings').upsert(
        [
          { key: 'platform_vat_number', value: vatNumber },
          { key: 'platform_name', value: platformName },
        ],
        { onConflict: 'key' }
      );
      toast({
        title: isRTL ? 'تم الحفظ' : 'Saved',
        description: isRTL ? 'تم تحديث إعدادات ZATCA' : 'ZATCA settings updated',
      });
    } catch (e: any) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: e?.message ?? 'failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {isRTL ? 'إعدادات الفواتير و ZATCA' : 'Invoicing & ZATCA Settings'}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'يظهر الرقم الضريبي للمنصة على فواتير العملاء. الرقم الضريبي للمزوّد (إن وُجد) يظهر على فاتورة العمولة.'
            : 'Platform VAT number appears on customer invoices. Provider VAT (if any) is used on commission invoices.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="platform_name">{isRTL ? 'اسم المنصة' : 'Platform Name'}</Label>
              <Input
                id="platform_name"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Hawaya"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform_vat_number">
                {isRTL ? 'الرقم الضريبي للمنصة (15 رقم)' : 'Platform VAT Number (15 digits)'}
              </Label>
              <Input
                id="platform_vat_number"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="3xxxxxxxxxxxxxx"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? 'يجب أن يبدأ بـ 3 ويتكون من 15 رقم وفق متطلبات هيئة الزكاة والضريبة.'
                  : 'Must start with 3 and be exactly 15 digits per ZATCA requirements.'}
              </p>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isRTL ? 'حفظ' : 'Save'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
