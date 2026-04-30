import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleLeft, Users, Briefcase, GraduationCap, Percent, Info } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useFeatureToggles, FeatureKey, FeatureToggles } from '@/hooks/useFeatureToggles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const FEATURES: Array<{
  key: FeatureKey;
  icon: React.ComponentType<{ className?: string }>;
  ar: { title: string; desc: string };
  en: { title: string; desc: string };
}> = [
  {
    key: 'groups',
    icon: Users,
    ar: { title: 'المجموعات', desc: 'التحكم في ظهور صفحات المجموعات وإخفائها' },
    en: { title: 'Groups', desc: 'Show or hide the Groups pages site-wide' },
  },
  {
    key: 'services',
    icon: Briefcase,
    ar: { title: 'الخدمات', desc: 'التحكم في ظهور صفحات الخدمات وإخفائها' },
    en: { title: 'Services', desc: 'Show or hide the Services pages site-wide' },
  },
  {
    key: 'trainings',
    icon: GraduationCap,
    ar: { title: 'التدريبات', desc: 'التحكم في ظهور صفحات التدريبات وإخفائها' },
    en: { title: 'Trainings', desc: 'Show or hide the Trainings pages site-wide' },
  },
  {
    key: 'discounts',
    icon: Percent,
    ar: { title: 'التخفيضات', desc: 'التحكم في ظهور صفحات التخفيضات وإخفائها' },
    en: { title: 'Discounts', desc: 'Show or hide the Discounts pages site-wide' },
  },
];

export const FeatureTogglesTab = () => {
  const { isRTL } = useLanguageContext();
  const { toggles, isLoading } = useFeatureToggles();
  const [local, setLocal] = useState<FeatureToggles>(toggles);
  const [saving, setSaving] = useState<FeatureKey | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocal(toggles);
  }, [toggles]);

  const handleToggle = async (key: FeatureKey, enabled: boolean) => {
    setSaving(key);
    const previous = local;
    const next = { ...local, [key]: enabled };
    setLocal(next);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: next as any })
        .eq('key', 'feature_toggles');
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['system-settings', 'feature_toggles'] });
      toast.success(
        isRTL
          ? enabled
            ? 'تم تفعيل الميزة'
            : 'تم إيقاف الميزة'
          : enabled
            ? 'Feature enabled'
            : 'Feature disabled'
      );
    } catch (err: any) {
      console.error('Feature toggle error', err);
      setLocal(previous);
      toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Failed to save change');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <ToggleLeft className="h-5 w-5" />
            {isRTL ? 'التحكم في الميزات' : 'Feature Toggles'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL
              ? 'تحكم في ظهور أقسام المنصة (المجموعات، الخدمات، التدريبات، التخفيضات) وإخفائها على مستوى الموقع.'
              : 'Control whether each platform section (Groups, Services, Trainings, Discounts) is visible site-wide.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? 'عند إيقاف أي ميزة، سيشاهد المستخدمون رسالة "الميزة هذه متوقفة حالياً" عند الدخول إلى صفحاتها.'
                : 'When a feature is disabled, users opening its pages will see a "feature currently disabled" message.'}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const meta = isRTL ? f.ar : f.en;
              const enabled = !!local[f.key];
              return (
                <div
                  key={f.key}
                  className={`flex items-center justify-between gap-4 rounded-lg border bg-card p-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-start gap-3 min-w-0 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className={`p-2 rounded-md ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor={`toggle-${f.key}`} className="text-base font-semibold">
                        {meta.title}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
                      <p className={`text-xs mt-1 font-medium ${enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {enabled
                          ? (isRTL ? 'مفعّلة' : 'Enabled')
                          : (isRTL ? 'متوقفة' : 'Disabled')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`toggle-${f.key}`}
                    checked={enabled}
                    disabled={isLoading || saving === f.key}
                    onCheckedChange={(v) => handleToggle(f.key, v)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureTogglesTab;