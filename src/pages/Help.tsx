import { useState, useEffect } from "react";
import { ChevronDown, Search, Phone, Mail, MessageCircle, BookOpen, Users, Shield, Loader2 } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_working_hours: { 
    ar: { weekdays: string; weekend: string }; 
    en: { weekdays: string; weekend: string };
  };
}

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { language, t, isRTL } = useLanguageContext();
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
        contact_phone: settings?.contact_phone || { primary: '+966 11 123 4567', secondary: '+966 11 123 4568' },
        contact_email: settings?.contact_email || { primary: 'info@hewaya.sa', secondary: 'support@hewaya.sa' },
        contact_working_hours: settings?.contact_working_hours || { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: 'الجمعة - السبت: مغلق' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: 'Fri - Sat: Closed' }
        },
      });
    } catch (error) {
      console.error('Error loading contact settings:', error);
      setContactSettings({
        contact_phone: { primary: '+966 11 123 4567', secondary: '+966 11 123 4568' },
        contact_email: { primary: 'info@hewaya.sa', secondary: 'support@hewaya.sa' },
        contact_working_hours: { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: 'الجمعة - السبت: مغلق' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: 'Fri - Sat: Closed' }
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const faqs = language === 'ar' ? [
    {
      question: "كيف يمكنني إنشاء حساب جديد؟",
      answer: "يمكنك إنشاء حساب جديد من خلال النقر على زر 'تسجيل الدخول' في أعلى الصفحة، ثم اختيار 'إنشاء حساب جديد'. ستحتاج إلى إدخال بريدك الإلكتروني وكلمة مرور قوية."
    },
    {
      question: "كيف أقوم بحجز فعالية؟",
      answer: "لحجز فعالية، تصفح الفعاليات المتاحة واختر الفعالية التي تريدها. انقر على 'عرض التفاصيل' ثم 'احجز الآن'. ستحتاج إلى تسجيل الدخول أولاً."
    },
    {
      question: "ما هي طرق الدفع المتاحة؟",
      answer: "نقبل جميع بطاقات الائتمان الرئيسية (فيزا، ماستركارد، أمريكان إكسبريس) بالإضافة إلى مدى و STC Pay و Apple Pay."
    },
    {
      question: "كيف يمكنني إلغاء حجزي؟",
      answer: "يمكنك إلغاء حجزك من خلال لوحة التحكم الخاصة بك. سياسة الإلغاء تختلف حسب نوع الفعالية ووقت الإلغاء."
    },
    {
      question: "كيف أصبح منظم فعاليات؟",
      answer: "في لوحة التحكم، يمكنك تغيير نوع حسابك إلى 'منظم فعاليات'. ستحتاج إلى تقديم بعض المعلومات الإضافية للتحقق من هويتك."
    },
    {
      question: "ما هي متطلبات السلامة؟",
      answer: "جميع الفعاليات تخضع لمعايير السلامة الصارمة. يجب على المشاركين اتباع إرشادات السلامة المحددة لكل فعالية."
    }
  ] : [
    {
      question: "How can I create a new account?",
      answer: "You can create a new account by clicking the 'Login' button at the top of the page, then choosing 'Create New Account'. You will need to enter your email and a strong password."
    },
    {
      question: "How do I book an event?",
      answer: "To book an event, browse the available events and select the one you want. Click 'View Details' then 'Book Now'. You will need to log in first."
    },
    {
      question: "What payment methods are available?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express) as well as Mada, STC Pay, and Apple Pay."
    },
    {
      question: "How can I cancel my booking?",
      answer: "You can cancel your booking through your dashboard. The cancellation policy varies depending on the event type and cancellation time."
    },
    {
      question: "How do I become an event organizer?",
      answer: "In your dashboard, you can change your account type to 'Event Organizer'. You will need to provide some additional information to verify your identity."
    },
    {
      question: "What are the safety requirements?",
      answer: "All events are subject to strict safety standards. Participants must follow the specific safety guidelines for each event."
    }
  ];

  const supportChannels = contactSettings ? [
    {
      icon: Phone,
      title: language === 'ar' ? "الهاتف" : "Phone",
      description: language === 'ar' ? "اتصل بنا مباشرة" : "Call us directly",
      contact: contactSettings.contact_phone.primary,
      hours: language === 'ar' 
        ? contactSettings.contact_working_hours.ar.weekdays 
        : contactSettings.contact_working_hours.en.weekdays
    },
    {
      icon: Mail,
      title: language === 'ar' ? "البريد الإلكتروني" : "Email", 
      description: language === 'ar' ? "راسلنا عبر البريد" : "Send us an email",
      contact: contactSettings.contact_email.secondary,
      hours: language === 'ar' ? "نرد خلال 24 ساعة" : "We respond within 24 hours"
    },
    {
      icon: MessageCircle,
      title: language === 'ar' ? "الدردشة المباشرة" : "Live Chat",
      description: language === 'ar' ? "تحدث معنا فوراً" : "Chat with us instantly",
      contact: language === 'ar' ? "متاح الآن" : "Available Now",
      hours: "24/7"
    }
  ] : [];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {language === 'ar' ? 'مركز المساعدة' : 'Help Center'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'نحن هنا لمساعدتك. ابحث عن إجابات لأسئلتك أو تواصل معنا مباشرة'
              : 'We are here to help. Find answers to your questions or contact us directly'}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={language === 'ar' ? "ابحث عن سؤالك..." : "Search for your question..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isRTL ? 'pr-12 text-right' : 'pl-12 text-left'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Users className="w-5 h-5" />
                  {language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'إجابات على أكثر الأسئلة شيوعاً' : 'Answers to the most common questions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <Collapsible
                      key={index}
                      open={openFaq === index}
                      onOpenChange={() => setOpenFaq(openFaq === index ? null : index)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`w-full p-4 h-auto ${isRTL ? 'flex-row-reverse justify-between text-right' : 'justify-between text-left'}`}
                        >
                          <span className={`font-medium flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{faq.question}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${openFaq === index ? 'transform rotate-180' : ''} ${isRTL ? 'mr-2' : 'ml-2'}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className={`px-4 pb-4 text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                          {faq.answer}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Channels */}
          <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Shield className="w-5 h-5" />
                  {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'طرق التواصل المختلفة' : 'Different ways to contact us'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportChannels.map((channel, index) => (
                    <div key={index} className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <channel.icon className="w-5 h-5 text-primary" />
                        <h3 className="font-medium">{channel.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{channel.description}</p>
                      <p className="text-sm font-medium">{channel.contact}</p>
                      <p className="text-xs text-muted-foreground">{channel.hours}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle>
                  {language === 'ar' ? 'روابط مفيدة' : 'Useful Links'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Button variant="ghost" className={`w-full ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`} asChild>
                    <a href="/safety">{language === 'ar' ? 'إرشادات السلامة' : 'Safety Guidelines'}</a>
                  </Button>
                  <Button variant="ghost" className={`w-full ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`} asChild>
                    <a href="/terms">{language === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}</a>
                  </Button>
                  <Button variant="ghost" className={`w-full ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`} asChild>
                    <a href="/privacy">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</a>
                  </Button>
                  <Button variant="ghost" className={`w-full ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`} asChild>
                    <a href="/refund">{language === 'ar' ? 'سياسة الاسترداد' : 'Refund Policy'}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;