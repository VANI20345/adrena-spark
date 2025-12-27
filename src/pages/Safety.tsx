import { Shield, AlertTriangle, CheckCircle, Users, Phone, Heart, MapPin, Clock } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const Safety = () => {
  const safetyGuidelines = [
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
  ];

  const emergencyContacts = [
    { service: "الطوارئ العامة", number: "211" },
    { service: "الإسعاف", number: "997" },
    { service: "الدفاع المدني", number: "998" },
    { service: "الشرطة - الأمن العام", number: "999" },
    { service: "دعم هواية", number: "+966 11 123 4567" }
  ];

  const riskLevels = [
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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">إرشادات السلامة</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            سلامتك هي أولويتنا القصوى. تعرف على إرشادات السلامة المهمة
          </p>
        </div>

        {/* Emergency Alert */}
        <Alert className="mb-8 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>هام:</strong> في حالة الطوارئ، اتصل على 999 فوراً. لا تتردد في طلب المساعدة إذا كنت في خطر.
          </AlertDescription>
        </Alert>

        {/* Risk Levels */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              مستويات المخاطر
            </CardTitle>
            <CardDescription>تصنيف الأنشطة حسب مستوى المخاطر</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskLevels.map((risk, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <Badge className={`${risk.color} mb-2`}>{risk.level}</Badge>
                  <p className="text-sm text-muted-foreground">{risk.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {safetyGuidelines.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.rules.map((rule, ruleIndex) => (
                    <li key={ruleIndex} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rule}</span>
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
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              أرقام الطوارئ
            </CardTitle>
            <CardDescription>احفظ هذه الأرقام في هاتفك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="p-4 border rounded-lg text-center">
                  <h3 className="font-semibold mb-2">{contact.service}</h3>
                  <p className="text-2xl font-bold text-primary">{contact.number}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Safety Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              نصائح إضافية للسلامة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  التحضير المسبق
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• تحقق من أحوال الطقس قبل الخروج</li>
                  <li>• احمل كمية كافية من الماء والطعام</li>
                  <li>• أخبر الآخرين عن خطة رحلتك</li>
                  <li>• تأكد من صلاحية معدات السلامة</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  أثناء النشاط
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• استمع لجسدك وخذ استراحات عند الحاجة</li>
                  <li>• لا تتجاهل علامات التعب أو الإجهاد</li>
                  <li>• حافظ على التواصل مع المجموعة</li>
                  <li>• اتبع مبدأ "عدم ترك أثر" في الطبيعة</li>
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