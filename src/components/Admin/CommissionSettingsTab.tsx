import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Percent, Save, AlertCircle, Calendar, Briefcase, GraduationCap, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface CommissionSettingsTabProps {
  isRTL?: boolean;
}

interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

const CommissionSettingsTab = ({ isRTL = false }: CommissionSettingsTabProps) => {
  const { language } = useLanguageContext();
  const [rates, setRates] = useState<CommissionRates>({
    events: 10,
    services: 10,
    training: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    ar: {
      title: 'إعدادات العمولة',
      description: 'تحديد نسب العمولة لكل نوع من الخدمات في المنصة',
      eventsCommission: 'عمولة الفعاليات',
      eventsDescription: 'نسبة العمولة المطبقة على حجوزات الفعاليات',
      servicesCommission: 'عمولة الخدمات',
      servicesDescription: 'نسبة العمولة المطبقة على الخدمات العادية',
      trainingCommission: 'عمولة التدريب',
      trainingDescription: 'نسبة العمولة المطبقة على خدمات التدريب',
      discountExemption: 'إعفاء الخصومات',
      discountExemptionNote: 'الخدمات المخفضة معفاة تلقائياً من العمولة (0%)',
      saveChanges: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      validationError: 'يجب أن تكون جميع النسب بين 0% و 100%',
      saveSuccess: 'تم حفظ إعدادات العمولة بنجاح',
      saveError: 'حدث خطأ أثناء حفظ الإعدادات',
      loadError: 'حدث خطأ أثناء تحميل الإعدادات',
      example: 'مثال: إذا كان السعر 100 ريال، فإن العمولة ستكون',
      riyal: 'ريال',
      currentRates: 'النسب الحالية',
    },
    en: {
      title: 'Commission Settings',
      description: 'Set commission percentages for each type of service on the platform',
      eventsCommission: 'Events Commission',
      eventsDescription: 'Commission percentage applied to event bookings',
      servicesCommission: 'Services Commission',
      servicesDescription: 'Commission percentage applied to regular services',
      trainingCommission: 'Training Commission',
      trainingDescription: 'Commission percentage applied to training services',
      discountExemption: 'Discount Exemption',
      discountExemptionNote: 'Discounted services are automatically exempt from commission (0%)',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      validationError: 'All percentages must be between 0% and 100%',
      saveSuccess: 'Commission settings saved successfully',
      saveError: 'Error saving settings',
      loadError: 'Error loading settings',
      example: 'Example: If price is 100 SAR, commission will be',
      riyal: 'SAR',
      currentRates: 'Current Rates',
    },
  };

  const t = translations[language];

  useEffect(() => {
    fetchCommissionRates();
  }, []);

  const fetchCommissionRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['commission_events', 'commission_services', 'commission_training']);

      if (error) throw error;

      const newRates = { ...rates };
      
      if (data) {
        data.forEach((item) => {
          const value = typeof item.value === 'object' && item.value !== null
            ? (item.value as { percentage?: number }).percentage
            : item.value;
          
          const percentage = Number(value) || 10;
          
          if (item.key === 'commission_events') newRates.events = percentage;
          if (item.key === 'commission_services') newRates.services = percentage;
          if (item.key === 'commission_training') newRates.training = percentage;
        });
      }

      setRates(newRates);
    } catch (err) {
      console.error('Error fetching commission rates:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  const validateRates = (): boolean => {
    return Object.values(rates).every(rate => rate >= 0 && rate <= 100);
  };

  const handleSave = async () => {
    if (!validateRates()) {
      setError(t.validationError);
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Save all three commission rates
      const updates = [
        {
          key: 'commission_events',
          value: { percentage: rates.events },
          description: 'Commission percentage for events',
          updated_at: new Date().toISOString(),
        },
        {
          key: 'commission_services',
          value: { percentage: rates.services },
          description: 'Commission percentage for services',
          updated_at: new Date().toISOString(),
        },
        {
          key: 'commission_training',
          value: { percentage: rates.training },
          description: 'Commission percentage for training',
          updated_at: new Date().toISOString(),
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success(t.saveSuccess);
    } catch (err) {
      console.error('Error saving commission rates:', err);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const CommissionInput = ({
    icon: Icon,
    label,
    description,
    value,
    onChange,
  }: {
    icon: React.ElementType;
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <Label className="text-base font-medium">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-24 text-center"
          />
          <span className="text-lg font-medium">%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
        {t.example} <span className="font-bold">{value.toFixed(2)} {t.riyal}</span>
      </p>
    </div>
  );

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
          {/* Current Rates Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-primary/5 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفعاليات' : 'Events'}</p>
              <p className="text-2xl font-bold text-primary">{rates.events}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الخدمات' : 'Services'}</p>
              <p className="text-2xl font-bold text-primary">{rates.services}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التدريب' : 'Training'}</p>
              <p className="text-2xl font-bold text-primary">{rates.training}%</p>
            </div>
          </div>

          {/* Commission Inputs */}
          <div className="space-y-4">
            <CommissionInput
              icon={Calendar}
              label={t.eventsCommission}
              description={t.eventsDescription}
              value={rates.events}
              onChange={(val) => setRates({ ...rates, events: val })}
            />

            <CommissionInput
              icon={Briefcase}
              label={t.servicesCommission}
              description={t.servicesDescription}
              value={rates.services}
              onChange={(val) => setRates({ ...rates, services: val })}
            />

            <CommissionInput
              icon={GraduationCap}
              label={t.trainingCommission}
              description={t.trainingDescription}
              value={rates.training}
              onChange={(val) => setRates({ ...rates, training: val })}
            />
          </div>

          {/* Discount Exemption Notice */}
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <Tag className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              <strong>{t.discountExemption}:</strong> {t.discountExemptionNote}
            </AlertDescription>
          </Alert>

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
