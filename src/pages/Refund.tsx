import { useState, useEffect } from "react";
import { CreditCard, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_working_hours: { 
    ar: { weekdays: string; weekend: string }; 
    en: { weekdays: string; weekend: string };
  };
}

const Refund = () => {
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
        .in('key', ['contact_phone', 'contact_email', 'contact_working_hours']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setContactSettings({
        contact_phone: settings?.contact_phone || { primary: '+966 11 123 4567', secondary: '' },
        contact_email: settings?.contact_email || { primary: 'support@hewaya.sa', secondary: '' },
        contact_working_hours: settings?.contact_working_hours || { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: '' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: '' }
        },
      });
    } catch (error) {
      console.error('Error loading contact settings:', error);
      setContactSettings({
        contact_phone: { primary: '+966 11 123 4567', secondary: '' },
        contact_email: { primary: 'support@hewaya.sa', secondary: '' },
        contact_working_hours: { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: '' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: '' }
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const refundPolicies = [
    {
      type: t('refund.policies.early.type'),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      description: t('refund.policies.early.description'),
      percentage: t('refund.policies.early.percentage'),
      timeframe: t('refund.policies.early.timeframe')
    },
    {
      type: t('refund.policies.medium.type'),
      icon: AlertCircle,
      color: "text-yellow-600", 
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      description: t('refund.policies.medium.description'),
      percentage: t('refund.policies.medium.percentage'),
      timeframe: t('refund.policies.medium.timeframe')
    },
    {
      type: t('refund.policies.late.type'),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/20", 
      description: t('refund.policies.late.description'),
      percentage: t('refund.policies.late.percentage'),
      timeframe: t('refund.policies.late.timeframe')
    }
  ];

  const exceptionalCases = t('refund.exceptional') as unknown as string[];

  const refundProcess = [
    { step: 1, title: t('refund.steps.step1.title'), description: t('refund.steps.step1.description') },
    { step: 2, title: t('refund.steps.step2.title'), description: t('refund.steps.step2.description') },
    { step: 3, title: t('refund.steps.step3.title'), description: t('refund.steps.step3.description') },
    { step: 4, title: t('refund.steps.step4.title'), description: t('refund.steps.step4.description') }
  ];

  const paymentMethods = [
    { 
      method: t('refund.paymentMethods.creditCard'), 
      time: t('refund.paymentMethods.creditCardTime'), 
      note: t('refund.paymentMethods.creditCardNote') 
    },
    { 
      method: t('refund.paymentMethods.mada'), 
      time: t('refund.paymentMethods.madaTime'), 
      note: t('refund.paymentMethods.madaNote') 
    },
    { 
      method: t('refund.paymentMethods.stcPay'), 
      time: t('refund.paymentMethods.stcPayTime'), 
      note: t('refund.paymentMethods.stcPayNote') 
    },
    { 
      method: t('refund.paymentMethods.applePay'), 
      time: t('refund.paymentMethods.applePayTime'), 
      note: t('refund.paymentMethods.applePayNote') 
    }
  ];

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
            <RefreshCw className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('refund.title')}</h1>
          <p className={`text-xl text-muted-foreground max-w-2xl mx-auto ${isRTL ? 'text-right md:text-center' : 'text-left md:text-center'}`}>
            {t('refund.subtitle')}
          </p>
          <p className={`text-sm text-muted-foreground mt-4 ${isRTL ? 'text-right md:text-center' : 'text-left md:text-center'}`}>
            {t('refund.lastUpdated')}: {currentYear}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Important Notice */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className={`text-blue-800 dark:text-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <strong>{t('refund.importantNote')}:</strong> {t('refund.importantNoteText')}
            </AlertDescription>
          </Alert>

          {/* Refund Policies */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <Clock className="w-5 h-5" />
                {t('refund.policiesTitle')}
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t('refund.policiesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {refundPolicies.map((policy, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${policy.bgColor}`}>
                    <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <policy.icon className={`w-5 h-5 ${policy.color}`} />
                      <h3 className="font-semibold text-sm">{policy.type}</h3>
                    </div>
                    <p className={`text-sm text-muted-foreground mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{policy.description}</p>
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Badge variant="secondary" className="font-semibold">
                        {policy.percentage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{policy.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exceptional Cases */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right w-full' : 'text-left w-full'}>{t('refund.exceptionalCases')}</CardTitle>
              <CardDescription className={isRTL ? 'text-right w-full' : 'text-left w-full'}>
                {t('refund.exceptionalCasesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
              <ul className={`space-y-3 list-none`}>
                {Array.isArray(exceptionalCases) && exceptionalCases.map((case_item: string, index: number) => (
                  <li key={index} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{case_item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Refund Process */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <CreditCard className="w-5 h-5" />
                {t('refund.processTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="space-y-4">
                {refundProcess.map((step, index) => (
                  <div key={index} className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full hero-gradient text-white font-semibold text-sm flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Refund Times */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('refund.paymentMethodsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.paymentMethod')}</th>
                      <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.refundTime')}</th>
                      <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethods.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className={`p-3 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{item.method}</td>
                        <td className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{item.time}</td>
                        <td className={`p-3 text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fees and Charges */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('refund.feesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className={`font-semibold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.processingFees')}</h3>
                  <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('refund.processingFeesDesc')}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className={`font-semibold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.bankFees')}</h3>
                  <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('refund.bankFeesDesc')}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className={`font-semibold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('refund.discountsTitle')}</h3>
                  <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('refund.discountsDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact for Refund */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('refund.contactTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-muted-foreground mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('refund.contactDesc')}
              </p>
              <Button variant="outline" asChild>
                <a href="/contact">{t('refund.contactSupport')}</a>
              </Button>
              <div className={`mt-4 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p><strong>{t('refund.email')}:</strong> {contactSettings?.contact_email.primary}</p>
                <p><strong>{t('refund.phone')}:</strong> {contactSettings?.contact_phone.primary}</p>
                <p><strong>{t('refund.workingHours')}:</strong> {language === 'ar' ? contactSettings?.contact_working_hours.ar.weekdays : contactSettings?.contact_working_hours.en.weekdays}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Refund;