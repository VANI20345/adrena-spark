import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Percent, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface CommissionSettingsTabProps {
  isRTL?: boolean;
}

const CommissionSettingsTab = ({ isRTL = false }: CommissionSettingsTabProps) => {
  const { language } = useLanguageContext();
  const [commission, setCommission] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    ar: {
      title: 'إعدادات العمولة',
      description: 'تحديد نسبة عمولة المنصة من الحجوزات والمعاملات',
      platformCommission: 'نسبة عمولة المنصة',
      commissionPercentage: 'النسبة المئوية',
      currentCommission: 'العمولة الحالية',
      saveChanges: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      validationError: 'يجب أن تكون النسبة بين 0% و 100%',
      saveSuccess: 'تم حفظ إعدادات العمولة بنجاح',
      saveError: 'حدث خطأ أثناء حفظ الإعدادات',
      loadError: 'حدث خطأ أثناء تحميل الإعدادات',
      commissionExplanation: 'هذه النسبة ستُطبق على جميع الحجوزات والمعاملات في المنصة',
      example: 'مثال: إذا كان سعر الحجز 100 ريال، فإن عمولة المنصة ستكون',
      riyal: 'ريال',
    },
    en: {
      title: 'Commission Settings',
      description: 'Set the platform commission percentage for bookings and transactions',
      platformCommission: 'Platform Commission',
      commissionPercentage: 'Percentage',
      currentCommission: 'Current Commission',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      validationError: 'Commission must be between 0% and 100%',
      saveSuccess: 'Commission settings saved successfully',
      saveError: 'Error saving settings',
      loadError: 'Error loading settings',
      commissionExplanation: 'This percentage will be applied to all bookings and transactions on the platform',
      example: 'Example: If booking price is 100 SAR, platform commission will be',
      riyal: 'SAR',
    },
  };

  const t = translations[language];

  useEffect(() => {
    fetchCommission();
  }, []);

  const fetchCommission = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_commission')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value !== undefined) {
        const value = typeof data.value === 'object' && data.value !== null 
          ? (data.value as { percentage?: number }).percentage 
          : data.value;
        setCommission(Number(value) || 10);
      }
    } catch (err) {
      console.error('Error fetching commission:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate commission percentage
    if (commission < 0 || commission > 100) {
      setError(t.validationError);
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'platform_commission',
          value: { percentage: commission },
          description: 'Platform commission percentage for bookings and transactions',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      toast.success(t.saveSuccess);
    } catch (err) {
      console.error('Error saving commission:', err);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const exampleAmount = 100;
  const exampleCommission = (exampleAmount * commission) / 100;

  if (loading) {
    return (
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Commission Display */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">{t.currentCommission}</span>
            <span className="text-2xl font-bold text-primary">{commission}%</span>
          </div>

          {/* Commission Input */}
          <div className="space-y-2">
            <Label htmlFor="commission">{t.commissionPercentage}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commission}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    setCommission(value);
                  }
                }}
                className="w-32"
              />
              <span className="text-lg font-medium">%</span>
            </div>
          </div>

          {/* Explanation */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t.commissionExplanation}
            </AlertDescription>
          </Alert>

          {/* Example Calculation */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t.example} <span className="font-bold text-foreground">{exampleCommission.toFixed(2)} {t.riyal}</span>
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t.saveChanges}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionSettingsTab;