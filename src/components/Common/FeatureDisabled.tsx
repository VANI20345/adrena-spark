import { PowerOff } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';

interface FeatureDisabledProps {
  featureKey: 'groups' | 'services' | 'trainings' | 'discounts';
}

const FEATURE_LABELS: Record<string, { ar: string; en: string }> = {
  groups: { ar: 'المجموعات', en: 'Groups' },
  services: { ar: 'الخدمات', en: 'Services' },
  trainings: { ar: 'التدريبات', en: 'Trainings' },
  discounts: { ar: 'التخفيضات', en: 'Discounts' },
};

const FeatureDisabled = ({ featureKey }: FeatureDisabledProps) => {
  const { isRTL } = useLanguageContext();
  const label = FEATURE_LABELS[featureKey];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="relative flex-1 overflow-hidden">
        {/* Blurred decorative background */}
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-[hsl(var(--brand-orange)/0.12)]" />
          <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-[hsl(var(--brand-lime)/0.35)] blur-3xl" />
          <div className="absolute -bottom-32 -right-24 w-[32rem] h-[32rem] rounded-full bg-[hsl(var(--brand-orange)/0.30)] blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[24rem] h-[24rem] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute inset-0 backdrop-blur-2xl bg-background/40" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-12rem)] px-4 py-16">
          <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-xl shadow-xl p-8 md:p-10">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted/80 flex items-center justify-center ring-4 ring-background/60">
              <PowerOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isRTL
                ? `ميزة ${label.ar} متوقفة حالياً`
                : `${label.en} feature is currently disabled`}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {isRTL
                ? 'تم إيقاف هذه الميزة مؤقتاً من قبل إدارة المنصة. يرجى المحاولة لاحقاً.'
                : 'This feature has been temporarily disabled by the platform administration. Please check back later.'}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeatureDisabled;