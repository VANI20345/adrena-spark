import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Percent, Save, AlertCircle, Calendar, Briefcase, GraduationCap, Tag, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';

interface CommissionSettingsTabProps {
  isRTL?: boolean;
}

interface CommissionRates {
  events: number;
  services: number;
  training: number;
  walletHoldPercent: number;
}

interface CommissionInputProps {
  icon: React.ElementType;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  exampleLabel: string;
  riyal: string;
}

const CommissionInput = React.memo(function CommissionInput({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  exampleLabel,
  riyal,
}: CommissionInputProps) {
  return (
    <div className="p-4 border rounded-lg space-y-3 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <Label className="text-base font-medium block">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-center gap-2">
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
            className="w-24 text-center tabular-nums"
            dir="ltr"
          />
          <span className="text-lg font-medium">%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground bg-muted p-2 rounded text-center">
        {exampleLabel} <span className="font-bold tabular-nums">{value.toFixed(2)} {riyal}</span>
      </p>
    </div>
  );
});

const CommissionSettingsTab = ({ isRTL = false }: CommissionSettingsTabProps) => {
  const { language } = useLanguageContext();
  const queryClient = useQueryClient();
  const [rates, setRates] = useState<CommissionRates>({
    events: 10,
    services: 10,
    training: 10,
    walletHoldPercent: 30,
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
      walletHoldCommission: 'نسبة الهولد من أرباح المزود',
      walletHoldDescription: 'نسبة المبلغ المحجوز من أرباح المزود (الباقي يصبح متاحاً فوراً)',
      discountExemption: 'إعفاء الخصومات',
      discountExemptionNote: 'الخدمات المخفضة معفاة تلقائياً من العمولة (0%)',
      saveChanges: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      validationError: 'يجب أن تكون جميع النسب بين 0% و 100%',
      saveSuccess: 'تم حفظ الإعدادات بنجاح',
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
      walletHoldCommission: 'Wallet Hold Percent',
      walletHoldDescription: 'Percentage of provider earnings held (the remainder becomes immediately available)',
      discountExemption: 'Discount Exemption',
      discountExemptionNote: 'Discounted services are automatically exempt from commission (0%)',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      validationError: 'All percentages must be between 0% and 100%',
      saveSuccess: 'Settings saved successfully',
      saveError: 'Error saving settings',
      loadError: 'Error loading settings',
      example: 'Example: If price is 100 SAR, commission will be',
      riyal: 'SAR',
      currentRates: 'Current Rates',
    },
  };

  const t = translations[language];

  // Track the original wallet hold percent to detect changes
  const originalHoldPercentRef = useRef<number>(30);

  useEffect(() => {
    fetchCommissionRates();
  }, []);

  const fetchCommissionRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['commission_events', 'commission_services', 'commission_training', 'wallet_hold_percent']);

      if (error) throw error;

      const newRates = { ...rates };
      
      if (data) {
        data.forEach((item) => {
          const value = typeof item.value === 'object' && item.value !== null
            ? (item.value as { percentage?: number }).percentage
            : item.value;
          
          const percentage = Number(value);
          if (!Number.isFinite(percentage)) return;
          
          if (item.key === 'commission_events') newRates.events = percentage;
          if (item.key === 'commission_services') newRates.services = percentage;
          if (item.key === 'commission_training') newRates.training = percentage;
          if (item.key === 'wallet_hold_percent') {
            newRates.walletHoldPercent = percentage;
            originalHoldPercentRef.current = percentage;
          }
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
      // Get current rates to compare
      const { data: currentSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['commission_events', 'commission_services', 'commission_training']);

      const currentRates: Record<string, number> = {};
      currentSettings?.forEach((item) => {
        const value = typeof item.value === 'object' && item.value !== null
          ? (item.value as { percentage?: number }).percentage
          : item.value;
        if (item.key === 'commission_events') currentRates.events = Number(value) || 10;
        if (item.key === 'commission_services') currentRates.services = Number(value) || 10;
        if (item.key === 'commission_training') currentRates.training = Number(value) || 10;
      });

      // Save commission rates + wallet hold percent
      const updates = [
        { key: 'commission_events', value: { percentage: rates.events } as any, description: 'Commission percentage for events', updated_at: new Date().toISOString() },
        { key: 'commission_services', value: { percentage: rates.services } as any, description: 'Commission percentage for services', updated_at: new Date().toISOString() },
        { key: 'commission_training', value: { percentage: rates.training } as any, description: 'Commission percentage for training', updated_at: new Date().toISOString() },
        { key: 'wallet_hold_percent', value: rates.walletHoldPercent as any, description: 'Percent of provider earnings to hold (0-100)', updated_at: new Date().toISOString() },
      ];

      for (const update of updates) {
        const { error } = await supabase.from('system_settings').upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      // Hold percent changes apply to NEW transactions only.
      // Existing active holds keep their originally-computed values.
      if (originalHoldPercentRef.current !== rates.walletHoldPercent) {
        originalHoldPercentRef.current = rates.walletHoldPercent;
        toast.info(
          language === 'ar'
            ? 'سيتم تطبيق نسبة الاحتجاز الجديدة على المعاملات الجديدة فقط.'
            : 'The new hold percentage will apply to new transactions only.'
        );
      }

      // Build targeted notifications based on what changed
      const eventsChanged = currentRates.events !== rates.events;
      const servicesChanged = currentRates.services !== rates.services;
      const trainingChanged = currentRates.training !== rates.training;

      // Collect target roles based on change type
      type AppRole = 'admin' | 'attendee' | 'organizer' | 'provider' | 'super_admin';
      const targetRoles: AppRole[] = [];
      if (eventsChanged) {
        targetRoles.push('attendee');
      }
      if (servicesChanged || trainingChanged) {
        targetRoles.push('provider');
      }
      targetRoles.push('admin', 'super_admin');

      const changes: string[] = [];
      if (eventsChanged) {
        changes.push(language === 'ar' 
          ? `عمولة الفعاليات: من ${currentRates.events}% إلى ${rates.events}%`
          : `Events commission: from ${currentRates.events}% to ${rates.events}%`);
      }
      if (servicesChanged) {
        changes.push(language === 'ar'
          ? `عمولة الخدمات: من ${currentRates.services}% إلى ${rates.services}%`
          : `Services commission: from ${currentRates.services}% to ${rates.services}%`);
      }
      if (trainingChanged) {
        changes.push(language === 'ar'
          ? `عمولة التدريب: من ${currentRates.training}% إلى ${rates.training}%`
          : `Training commission: from ${currentRates.training}% to ${rates.training}%`);
      }

      // Send targeted notifications (wrapped in separate try-catch so failures don't block save success)
      if (changes.length > 0) {
        try {
          const uniqueRoles = [...new Set(targetRoles)] as AppRole[];
          const { data: targetUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', uniqueRoles);

          const userIds = [...new Set(targetUsers?.map(u => u.user_id) || [])];

          if (userIds.length > 0) {
            try {
              await supabase.functions.invoke('send-notifications', {
                body: {
                  user_ids: userIds,
                  title: language === 'ar' ? 'تغيير نسبة العمولة' : 'Commission Rate Changed',
                  message: changes.join('\n'),
                  type: 'commission_change',
                },
              });
            } catch {
              // Edge function failed, fall back to direct DB insert
              const notifications = userIds.map(uid => ({
                user_id: uid,
                title: language === 'ar' ? 'تغيير نسبة العمولة' : 'Commission Rate Changed',
                message: changes.join('\n'),
                type: 'commission_change',
                read: false,
              }));
              await supabase.from('notifications').insert(notifications);
            }
          }
        } catch (notifErr) {
          console.warn('Failed to send commission change notifications:', notifErr);
          // Don't throw - save was already successful
        }
      }

      // Invalidate related queries so holds/financial pages refresh with new values
      queryClient.invalidateQueries({ queryKey: ['wallet-hold-percent'] });
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard-v2'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });

      toast.success(t.saveSuccess);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving commission rates:', err);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  // CommissionInput is defined outside as a memo'd component to prevent scroll issues

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
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            {t.title}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Rates Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-primary/5 rounded-lg" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفعاليات' : 'Events'}</p>
              <p className="text-2xl font-bold text-primary tabular-nums" dir="ltr">{rates.events}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الخدمات' : 'Services'}</p>
              <p className="text-2xl font-bold text-primary tabular-nums" dir="ltr">{rates.services}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التدريب' : 'Training'}</p>
              <p className="text-2xl font-bold text-primary tabular-nums" dir="ltr">{rates.training}%</p>
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
              exampleLabel={t.example}
              riyal={t.riyal}
            />

            <CommissionInput
              icon={Briefcase}
              label={t.servicesCommission}
              description={t.servicesDescription}
              value={rates.services}
              onChange={(val) => setRates({ ...rates, services: val })}
              exampleLabel={t.example}
              riyal={t.riyal}
            />

            <CommissionInput
              icon={GraduationCap}
              label={t.trainingCommission}
              description={t.trainingDescription}
              value={rates.training}
              onChange={(val) => setRates({ ...rates, training: val })}
              exampleLabel={t.example}
              riyal={t.riyal}
            />

            <CommissionInput
              icon={Lock}
              label={t.walletHoldCommission}
              description={t.walletHoldDescription}
              value={rates.walletHoldPercent}
              onChange={(val) => setRates({ ...rates, walletHoldPercent: val })}
              exampleLabel={t.example}
              riyal={t.riyal}
            />
          </div>

          {/* Hold percent scope notice */}
          <Alert dir={isRTL ? 'rtl' : 'ltr'}>
            <Lock className="h-4 w-4" />
            <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? 'ملاحظة: تغيير نسبة الاحتجاز ينطبق على المعاملات الجديدة فقط. المعاملات والحجوزات السابقة تحتفظ بقيم الاحتجاز الأصلية ولن يُعاد احتسابها.'
                : 'Note: Changing the hold percentage applies to new transactions only. Existing bookings and holds keep their original values and are not recalculated.'}
            </AlertDescription>
          </Alert>

          {/* Discount Exemption Notice */}
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" dir={isRTL ? 'rtl' : 'ltr'}>
            <Tag className="h-4 w-4 text-green-600" />
            <AlertDescription className={`text-green-700 dark:text-green-400 ${isRTL ? 'text-right' : 'text-left'}`}>
              <strong>{t.discountExemption}:</strong> {t.discountExemptionNote}
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>{error}</AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className={isRTL ? 'flex justify-end' : ''}>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {saving ? (
                <>
                  <span className={`animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`}>⏳</span>
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.saveChanges}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionSettingsTab;
