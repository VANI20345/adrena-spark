import { useState, useEffect } from "react";
import { FileText, Calendar, Users, CreditCard, Shield, AlertCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

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

  if (loading) {
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

          {/* Terms Sections */}
          {sectionKeys.map((key, index) => {
            const IconComponent = sectionIcons[index];
            const title = t(`terms.sections.${key}.title`);
            const items = t(`terms.sections.${key}.items`);
            const itemsArray = typeof items === 'string' ? [] : (items as unknown as string[]) || [];

            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <IconComponent className="w-6 h-6 text-primary flex-shrink-0" />
                    <span>{title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`space-y-3 list-disc ${isRTL ? 'mr-6 text-right' : 'ml-6 text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {itemsArray.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
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