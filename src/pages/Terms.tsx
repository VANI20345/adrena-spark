import { FileText, Calendar, Users, CreditCard, Shield, AlertCircle } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguageContext } from "@/contexts/LanguageContext";

const Terms = () => {
  const { t, isRTL, language } = useLanguageContext();
  const lastUpdated = language === 'ar' ? "1 يناير 2024" : "January 1, 2024";

  const sectionIcons = [Users, Calendar, CreditCard, Shield, FileText, AlertCircle];
  const sectionKeys = ['acceptance', 'bookings', 'payment', 'liability', 'intellectual', 'conduct'] as const;

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
            {t('terms.lastUpdated')}: {lastUpdated}
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
                    <IconComponent className="w-6 h-6 text-primary" />
                    {title}
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
                <p><strong>{t('terms.email')}:</strong> info@hewaya.sa</p>
                <p><strong>{t('terms.phone')}:</strong> +966 11 123 4567</p>
                <p><strong>{t('terms.address')}:</strong> {language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</p>
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
