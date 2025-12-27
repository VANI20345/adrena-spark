import { Lock, Eye, Database, Share2, Shield, Cookie } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguageContext } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { t, isRTL, language } = useLanguageContext();
  const lastUpdated = language === 'ar' ? "1 يناير 2024" : "January 1, 2024";

  const sectionIcons = [Database, Eye, Share2, Lock, Cookie, Shield];
  const sectionKeys = ['collect', 'use', 'sharing', 'protection', 'cookies', 'rights'] as const;

  const dataRetention = [
    { type: t('privacy.retention.accountInfo'), period: t('privacy.retention.accountInfoPeriod') },
    { type: t('privacy.retention.transactionHistory'), period: t('privacy.retention.transactionHistoryPeriod') },
    { type: t('privacy.retention.browsingHistory'), period: t('privacy.retention.browsingHistoryPeriod') },
    { type: t('privacy.retention.messagesReviews'), period: t('privacy.retention.messagesReviewsPeriod') }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`text-center mb-12 ${isRTL ? 'text-right' : 'text-left'} md:text-center`}>
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('privacy.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('privacy.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            {t('privacy.lastUpdated')}: {lastUpdated}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Privacy Alert */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className={`text-blue-800 dark:text-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <strong>{t('privacy.commitment')}:</strong> {t('privacy.commitmentText')}
            </AlertDescription>
          </Alert>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('privacy.introduction')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('privacy.introText')}
              </p>
            </CardContent>
          </Card>

          {/* Privacy Sections */}
          {sectionKeys.map((key, index) => {
            const IconComponent = sectionIcons[index];
            const title = t(`privacy.sections.${key}.title`);
            const items = t(`privacy.sections.${key}.items`);
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
                  <ul className={`space-y-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {itemsArray.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                        <span className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('privacy.dataRetention')}</CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('privacy.dataRetentionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className={`p-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('privacy.dataType')}</th>
                      <th className={`p-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('privacy.retentionPeriod')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRetention.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{item.type}</td>
                        <td className={`p-2 text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{item.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Third Party Services */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('privacy.thirdParty')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('privacy.thirdPartyDesc')}
              </p>
              <ul className={`space-y-2 list-disc ${isRTL ? 'mr-6 text-right' : 'ml-6 text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <li><strong>{t('privacy.paymentServices')}:</strong> {t('privacy.paymentServicesDesc')}</li>
                <li><strong>{t('privacy.analyticsServices')}:</strong> {t('privacy.analyticsServicesDesc')}</li>
                <li><strong>{t('privacy.emailServices')}:</strong> {t('privacy.emailServicesDesc')}</li>
                <li><strong>{t('privacy.cloudServices')}:</strong> {t('privacy.cloudServicesDesc')}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('privacy.contact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('privacy.contactText')}
              </p>
              <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p><strong>{t('privacy.dpo')}:</strong> info@hewaya.sa</p>
                <p><strong>{t('privacy.phone')}:</strong> +966 11 123 4567</p>
                <p><strong>{t('privacy.address')}:</strong> {language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Updates Notice */}
          <Alert>
            <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t('privacy.updateNotice')}
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
