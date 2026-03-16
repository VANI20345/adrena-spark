import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Users, Phone, Heart, MapPin, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ContactSettings {
  contact_phone?: { primary: string; secondary: string };
  contact_email?: { primary: string; secondary: string };
}

const Safety = () => {
  const { language, isRTL } = useLanguageContext();
  const [loading, setLoading] = useState(true);
  const [supportPhone, setSupportPhone] = useState('+966 11 123 4567');
  const [supportEmail, setSupportEmail] = useState('support@hewaya.sa');

  useEffect(() => {
    loadContactSettings();
  }, []);

  const loadContactSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['contact_phone', 'contact_email']);

      if (data && data.length > 0) {
        data.forEach((setting) => {
          if (setting.key === 'contact_phone' && setting.value) {
            const phoneData = setting.value as { primary: string; secondary: string };
            setSupportPhone(phoneData.primary || '+966 11 123 4567');
          }
          if (setting.key === 'contact_email' && setting.value) {
            const emailData = setting.value as { primary: string; secondary: string };
            setSupportEmail(emailData.primary || 'support@hewaya.sa');
          }
        });
      }
    } catch (error) {
      console.error('Error loading contact settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const safetyGuidelines = language === 'ar' ? [
    {
      icon: Users,
      title: "قبل الفعالية",
      rules: [
        "تأكد من قراءة جميع المتطلبات والشروط للفعالية",
        "احضر الأدوات والمعدات المطلوبة",
        "تأكد من حالتك الصحية قبل المشاركة",
        "اتبع تعليمات اللباس والسلامة المحددة",
        "وصل في الوقت المحدد لتلقي التوجيهات"
      ]
    },
    {
      icon: Shield,
      title: "أثناء الفعالية",
      rules: [
        "اتبع تعليمات المنظمين والمرشدين في جميع الأوقات",
        "لا تخرج عن المسار أو المنطقة المحددة",
        "ابلغ عن أي مشكلة أو حادث فوراً",
        "استخدم معدات السلامة المطلوبة دائماً",
        "ابق مع المجموعة ولا تبتعد وحدك"
      ]
    },
    {
      icon: Heart,
      title: "الصحة والسلامة",
      rules: [
        "أبلغ عن أي حالة طبية أو حساسية مسبقاً",
        "احمل أدويتك الشخصية معك",
        "اشرب الماء بانتظام لتجنب الجفاف",
        "ارتد واقي الشمس والملابس المناسبة",
        "لا تشارك إذا كنت تشعر بتعب أو مرض"
      ]
    },
    {
      icon: Phone,
      title: "حالات الطوارئ",
      rules: [
        "احفظ أرقام الطوارئ للفعالية",
        "تأكد من شحن هاتفك المحمول",
        "أبلغ شخصاً قريباً عن مكان وجودك",
        "اعرف موقع أقرب مركز طبي",
        "اتبع خطة الإخلاء في حالة الطوارئ"
      ]
    }
  ] : [
    {
      icon: Users,
      title: "Before the Event",
      rules: [
        "Make sure to read all the requirements and conditions for the event",
        "Bring the required tools and equipment",
        "Check your health condition before participating",
        "Follow the specified dress code and safety instructions",
        "Arrive on time to receive the briefing"
      ]
    },
    {
      icon: Shield,
      title: "During the Event",
      rules: [
        "Follow the organizers' and guides' instructions at all times",
        "Do not leave the designated path or area",
        "Report any problem or incident immediately",
        "Always use the required safety equipment",
        "Stay with the group and don't wander off alone"
      ]
    },
    {
      icon: Heart,
      title: "Health and Safety",
      rules: [
        "Report any medical condition or allergy in advance",
        "Carry your personal medications with you",
        "Drink water regularly to avoid dehydration",
        "Wear sunscreen and appropriate clothing",
        "Don't participate if you feel tired or sick"
      ]
    },
    {
      icon: Phone,
      title: "Emergencies",
      rules: [
        "Save the emergency numbers for the event",
        "Make sure your mobile phone is charged",
        "Inform someone close about your location",
        "Know the location of the nearest medical center",
        "Follow the evacuation plan in case of emergency"
      ]
    }
  ];

  const emergencyContacts = language === 'ar' ? [
    { service: "الطوارئ العامة", number: "211" },
    { service: "الإسعاف", number: "997" },
    { service: "الدفاع المدني", number: "998" },
    { service: "الشرطة - الأمن العام", number: "999" },
    { service: "دعم هواية (هاتف)", number: supportPhone },
    { service: "دعم هواية (بريد)", number: supportEmail }
  ] : [
    { service: "General Emergency", number: "211" },
    { service: "Ambulance", number: "997" },
    { service: "Civil Defense", number: "998" },
    { service: "Police - Public Security", number: "999" },
    { service: "Hewaya Support (Phone)", number: supportPhone },
    { service: "Hewaya Support (Email)", number: supportEmail }
  ];

  const riskLevels = language === 'ar' ? [
    {
      level: "منخفض",
      color: "bg-green-100 text-green-800",
      description: "أنشطة آمنة مناسبة لجميع الأعمار مع الحد الأدنى من المخاطر"
    },
    {
      level: "متوسط", 
      color: "bg-yellow-100 text-yellow-800",
      description: "أنشطة تتطلب حذر إضافي ومعدات سلامة أساسية"
    },
    {
      level: "عالي",
      color: "bg-red-100 text-red-800", 
      description: "أنشطة مغامرة تتطلب خبرة ومعدات سلامة متخصصة"
    }
  ] : [
    {
      level: "Low",
      color: "bg-green-100 text-green-800",
      description: "Safe activities suitable for all ages with minimal risk"
    },
    {
      level: "Medium", 
      color: "bg-yellow-100 text-yellow-800",
      description: "Activities requiring extra caution and basic safety equipment"
    },
    {
      level: "High",
      color: "bg-red-100 text-red-800", 
      description: "Adventure activities requiring experience and specialized safety equipment"
    }
  ];

  const additionalTips = language === 'ar' ? {
    preparation: {
      title: "التحضير المسبق",
      items: [
        "تحقق من أحوال الطقس قبل الخروج",
        "احمل كمية كافية من الماء والطعام",
        "أخبر الآخرين عن خطة رحلتك",
        "تأكد من صلاحية معدات السلامة"
      ]
    },
    duringActivity: {
      title: "أثناء النشاط",
      items: [
        "استمع لجسدك وخذ استراحات عند الحاجة",
        "لا تتجاهل علامات التعب أو الإجهاد",
        "حافظ على التواصل مع المجموعة",
        "اتبع مبدأ \"عدم ترك أثر\" في الطبيعة"
      ]
    }
  } : {
    preparation: {
      title: "Pre-Activity Preparation",
      items: [
        "Check the weather conditions before going out",
        "Carry enough water and food",
        "Tell others about your trip plan",
        "Make sure your safety equipment is valid"
      ]
    },
    duringActivity: {
      title: "During the Activity",
      items: [
        "Listen to your body and take breaks when needed",
        "Don't ignore signs of fatigue or exhaustion",
        "Maintain communication with the group",
        "Follow the \"Leave No Trace\" principle in nature"
      ]
    }
  };

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
      
      <main className={`safety-container flex-1 container mx-auto px-4 py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <div className={`text-center mb-12 ${isRTL ? 'text-right md:text-center' : 'text-left md:text-center'}`}>
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {language === 'ar' ? 'إرشادات السلامة' : 'Safety Guidelines'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'سلامتك هي أولويتنا القصوى. تعرف على إرشادات السلامة المهمة'
              : 'Your safety is our top priority. Learn about important safety guidelines'}
          </p>
        </div>

        {/* Emergency Alert */}
        <Alert className={`mb-8 border-red-200 bg-red-50 ${isRTL ? 'text-right' : 'text-left'}`}>
          <AlertTriangle className={`h-4 w-4 text-red-600 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <AlertDescription className={`text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}>
            <strong>{language === 'ar' ? 'هام:' : 'Important:'}</strong> {language === 'ar' 
              ? 'في حالة الطوارئ، اتصل على 999 فوراً. لا تتردد في طلب المساعدة إذا كنت في خطر.'
              : 'In case of emergency, call 999 immediately. Don\'t hesitate to ask for help if you are in danger.'}
          </AlertDescription>
        </Alert>

        {/* Risk Levels */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <AlertTriangle className="w-5 h-5" />
              {language === 'ar' ? 'مستويات المخاطر' : 'Risk Levels'}
            </CardTitle>
            <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
              {language === 'ar' ? 'تصنيف الأنشطة حسب مستوى المخاطر' : 'Activity classification by risk level'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskLevels.map((risk, index) => (
                <div key={index} className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Badge className={`${risk.color} mb-2`}>{risk.level}</Badge>
                  <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{risk.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {safetyGuidelines.map((section, index) => (
            <Card key={index}>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <section.icon className="w-5 h-5 text-primary" />
                  <span>{section.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className={isRTL ? 'text-right' : 'text-left'}>
                <ul className={`space-y-3 list-none ${isRTL ? 'pr-0 text-right' : 'pl-0 text-left'}`}>
                  {section.rules.map((rule, ruleIndex) => (
                    <li
                      key={ruleIndex}
                      className={`flex w-full items-start gap-3 ${isRTL ? 'flex-row-reverse justify-end text-right' : ''}`}
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className={`text-sm block w-full ${isRTL ? 'text-right' : 'text-left'}`}>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Contacts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <Phone className="w-5 h-5" />
              {language === 'ar' ? 'أرقام الطوارئ' : 'Emergency Numbers'}
            </CardTitle>
            <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
              {language === 'ar' ? 'احفظ هذه الأرقام في هاتفك' : 'Save these numbers on your phone'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-center'}`}>
                  <h3 className={`font-semibold mb-2 ${isRTL ? 'text-right' : 'text-center'}`}>{contact.service}</h3>
                  <p
                    className={`text-2xl font-bold text-primary ${isRTL ? 'text-right' : 'text-center'}`}
                    dir="ltr"
                  >
                    {contact.number}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Safety Tips */}
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <MapPin className="w-5 h-5" />
              <span>{language === 'ar' ? 'نصائح إضافية للسلامة' : 'Additional Safety Tips'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{additionalTips.preparation.title}</span>
                </h3>
                <ul className={`space-y-3 text-sm list-none ${isRTL ? 'pr-0 text-right' : 'pl-0 text-left'}`}>
                  {additionalTips.preparation.items.map((item, index) => (
                    <li
                      key={index}
                      className={`flex w-full items-start gap-2 ${isRTL ? 'flex-row-reverse justify-end text-right' : ''}`}
                    >
                      <span className="text-primary font-bold">•</span>
                      <span className={`block w-full ${isRTL ? 'text-right' : 'text-left'}`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Heart className="w-4 h-4 text-primary" />
                  <span>{additionalTips.duringActivity.title}</span>
                </h3>
                <ul className={`space-y-3 text-sm list-none ${isRTL ? 'pr-0 text-right' : 'pl-0 text-left'}`}>
                  {additionalTips.duringActivity.items.map((item, index) => (
                    <li
                      key={index}
                      className={`flex w-full items-start gap-2 ${isRTL ? 'flex-row-reverse justify-end text-right' : ''}`}
                    >
                      <span className="text-primary font-bold">•</span>
                      <span className={`block w-full ${isRTL ? 'text-right' : 'text-left'}`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Safety;