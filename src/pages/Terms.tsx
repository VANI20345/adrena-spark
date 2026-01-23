import { useState, useEffect } from "react";
import { FileText, Calendar, Users, CreditCard, Shield, AlertCircle, Loader2, Percent, Tag } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useCommissionRates } from "@/hooks/useCommissionRates";

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_address: { ar: string; en: string };
}

const Terms = () => {
  const { t, isRTL, language } = useLanguageContext();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const { rates: commissionRates, loading: commissionLoading } = useCommissionRates();

  const translations = {
    ar: {
      commissionTitle: 'نسب العمولة',
      commissionDescription: 'تفرض المنصة نسب عمولة على المعاملات المالية وفقاً للتالي:',
      eventsCommission: 'عمولة الفعاليات',
      servicesCommission: 'عمولة الخدمات',
      trainingCommission: 'عمولة التدريب',
      discountExemption: 'إعفاء الخصومات',
      discountExemptionNote: 'جميع الخدمات المخفضة معفاة تماماً من العمولة',
      commissionNote: 'ملاحظة: يتم خصم العمولة من مبلغ الخدمة أو الفعالية وتُحول الأرباح الصافية لمقدم الخدمة أو المنظم.',
    },
    en: {
      commissionTitle: 'Commission Rates',
      commissionDescription: 'The platform charges commission on financial transactions as follows:',
      eventsCommission: 'Events Commission',
      servicesCommission: 'Services Commission',
      trainingCommission: 'Training Commission',
      discountExemption: 'Discount Exemption',
      discountExemptionNote: 'All discounted services are fully exempt from commission',
      commissionNote: 'Note: Commission is deducted from the service or event amount, and net earnings are transferred to the provider or organizer.',
    }
  };

  const localT = translations[language];

  useEffect(() => {
    loadContactSettings();
  }, []);

  const loadContactSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['contact_phone', 'contact_email', 'contact_address']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setContactSettings({
        contact_phone: settings?.contact_phone || { primary: '+966 11 123 4567', secondary: '' },
        contact_email: settings?.contact_email || { primary: 'info@hewaya.sa', secondary: '' },
        contact_address: settings?.contact_address || { ar: 'الرياض، المملكة العربية السعودية', en: 'Riyadh, Saudi Arabia' },
      });
    } catch (error) {
      console.error('Error loading contact settings:', error);
      setContactSettings({
        contact_phone: { primary: '+966 11 123 4567', secondary: '' },
        contact_email: { primary: 'info@hewaya.sa', secondary: '' },
        contact_address: { ar: 'الرياض، المملكة العربية السعودية', en: 'Riyadh, Saudi Arabia' },
      });
    } finally {
      setLoading(false);
    }
  };

  const sectionIcons = [Users, Calendar, CreditCard, Shield, FileText, AlertCircle];
  const sectionKeys = ['acceptance', 'bookings', 'payment', 'liability', 'intellectual', 'conduct'] as const;

  if (loading || commissionLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`text-center mb-12 ${isRTL ? 'text-right' : 'text-left'} md:text-center`}>
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('terms.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('terms.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            {t('terms.lastUpdated')}: {currentYear}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('terms.introduction')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('terms.introText')}
              </p>
            </CardContent>
          </Card>

          {/* Commission Rates Section - Dynamic from Admin Settings */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Percent className="w-6 h-6 text-primary flex-shrink-0" />
                <span>{localT.commissionTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                {localT.commissionDescription}
              </p>

              {/* Commission Rates Display */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`p-4 bg-background rounded-lg border ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="font-medium">{localT.eventsCommission}</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">{commissionRates.events}%</div>
                </div>

                <div className={`p-4 bg-background rounded-lg border ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="font-medium">{localT.servicesCommission}</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">{commissionRates.services}%</div>
                </div>

                <div className={`p-4 bg-background rounded-lg border ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-medium">{localT.trainingCommission}</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">{commissionRates.training}%</div>
                </div>
              </div>

              {/* Discount Exemption Notice */}
              <div className={`flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Tag className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 mb-2">
                    {localT.discountExemption}
                  </Badge>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {localT.discountExemptionNote}
                  </p>
                </div>
              </div>

              <p className={`text-sm text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`}>
                {localT.commissionNote}
              </p>
            </CardContent>
          </Card>

          {/* Terms Sections */}
          {sectionKeys.map((key, index) => {
            const IconComponent = sectionIcons[index];
            const title = t(`terms.sections.${key}.title`);
            const items = t(`terms.sections.${key}.items`);
            const itemsArray = typeof items === 'string' ? [] : (items as unknown as string[]) || [];

            return (
              <Card key={key} dir={isRTL ? 'rtl' : 'ltr'}>
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <IconComponent className="w-6 h-6 text-primary flex-shrink-0" />
                    <span>{title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`space-y-3 list-disc ${isRTL ? 'mr-6 text-right' : 'ml-6 text-left'}`}>
                    {itemsArray.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('terms.contact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('terms.contactText')}
              </p>
              <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p><strong>{t('terms.email')}:</strong> {contactSettings?.contact_email.primary}</p>
                <p><strong>{t('terms.phone')}:</strong> {contactSettings?.contact_phone.primary}</p>
                <p><strong>{t('terms.address')}:</strong> {language === 'ar' ? contactSettings?.contact_address.ar : contactSettings?.contact_address.en}</p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Footer Note */}
          <div className={`text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'} md:text-center`}>
            <p>
              {t('terms.footerNote')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
