import { Lock, Eye, Database, Share2, Shield, Cookie } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Privacy = () => {
  const lastUpdated = "1 يناير 2024";

  const privacySections = [
    {
      icon: Database,
      title: "1. المعلومات التي نجمعها",
      content: [
        "معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، تاريخ الميلاد",
        "معلومات الملف الشخصي: الصورة الشخصية، الوصف، المدينة، الاهتمامات",
        "معلومات الاستخدام: سجل التصفح، الفعاليات المحجوزة، التفضيلات",
        "معلومات الجهاز: نوع الجهاز، نظام التشغيل، عنوان IP، معرف الجهاز",
        "معلومات الموقع: الموقع الجغرافي (عند الموافقة)"
      ]
    },
    {
      icon: Eye,
      title: "2. كيف نستخدم معلوماتك",
      content: [
        "تقديم وتحسين خدماتنا ومنصتنا",
        "معالجة الحجوزات والمدفوعات",
        "التواصل معك بشأن حسابك والفعاليات",
        "إرسال إشعارات مهمة وتحديثات الخدمة",
        "تخصيص تجربتك وعرض محتوى مناسب",
        "تحليل استخدام المنصة لتحسين الأداء"
      ]
    },
    {
      icon: Share2,
      title: "3. مشاركة المعلومات",
      content: [
        "لا نبيع معلوماتك الشخصية لأطراف ثالثة",
        "قد نشارك معلومات مع مقدمي الخدمات المعتمدين",
        "مشاركة معلومات مع منظمي الفعاليات عند الحجز",
        "الكشف عن المعلومات عند طلب السلطات القانونية",
        "مشاركة معلومات مجهولة الهوية لأغراض إحصائية"
      ]
    },
    {
      icon: Lock,
      title: "4. حماية المعلومات",
      content: [
        "استخدام تشفير SSL لحماية البيانات أثناء النقل",
        "تخزين البيانات في خوادم آمنة ومحمية",
        "التحكم في الوصول إلى المعلومات الشخصية",
        "مراقبة الأنظمة بحثاً عن نشاط مشبوه",
        "تدريب الموظفين على أفضل ممارسات الأمان"
      ]
    },
    {
      icon: Cookie,
      title: "5. ملفات تعريف الارتباط",
      content: [
        "نستخدم ملفات تعريف الارتباط لتحسين تجربة الاستخدام",
        "ملفات ضرورية لعمل الموقع الأساسي",
        "ملفات تحليلية لفهم سلوك المستخدمين",
        "ملفات تخصيص لحفظ تفضيلاتك",
        "يمكنك التحكم في إعدادات ملفات تعريف الارتباط من متصفحك"
      ]
    },
    {
      icon: Shield,
      title: "6. حقوقك",
      content: [
        "الحق في الوصول إلى معلوماتك الشخصية",
        "الحق في تصحيح المعلومات غير الدقيقة",
        "الحق في حذف حسابك ومعلوماتك",
        "الحق في تحديد مشاركة المعلومات",
        "الحق في نقل بياناتك إلى خدمة أخرى",
        "الحق في الاعتراض على معالجة معلوماتك"
      ]
    }
  ];

  const dataRetention = [
    { type: "معلومات الحساب", period: "طوال فترة النشاط + 3 سنوات بعد الإغلاق" },
    { type: "سجل المعاملات", period: "7 سنوات (متطلبات قانونية)" },
    { type: "سجل التصفح", period: "6 أشهر" },
    { type: "الرسائل والتقييمات", period: "5 سنوات أو حتى الحذف" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">سياسة الخصوصية</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نحن نحترم خصوصيتك ونلتزم بحماية معلوماتك الشخصية
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            آخر تحديث: {lastUpdated}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Privacy Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>التزامنا:</strong> نحن ملتزمون بحماية خصوصيتك وفقاً لأعلى المعايير الدولية ولوائح حماية البيانات في المملكة العربية السعودية.
            </AlertDescription>
          </Alert>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>مقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                هذه السياسة توضح كيف نجمع ونستخدم ونحمي معلوماتك الشخصية عند استخدام منصة أدرينا. 
                نحن نتبع أفضل الممارسات في حماية البيانات ونلتزم بالشفافية الكاملة معك حول معلوماتك.
              </p>
            </CardContent>
          </Card>

          {/* Privacy Sections */}
          {privacySections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <section.icon className="w-6 h-6 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>7. الاحتفاظ بالبيانات</CardTitle>
              <CardDescription>كم من الوقت نحتفظ بمعلوماتك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-2">نوع البيانات</th>
                      <th className="text-right p-2">فترة الاحتفاظ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRetention.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{item.type}</td>
                        <td className="p-2 text-muted-foreground">{item.period}</td>
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
              <CardTitle>8. الخدمات الخارجية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                نستخدم خدمات طرف ثالث موثوقة لتحسين خدماتنا:
              </p>
              <ul className="space-y-2">
                <li>• <strong>خدمات الدفع:</strong> معالجة آمنة للمدفوعات</li>
                <li>• <strong>خدمات التحليلات:</strong> فهم استخدام المنصة</li>
                <li>• <strong>خدمات البريد الإلكتروني:</strong> إرسال الإشعارات والتحديثات</li>
                <li>• <strong>خدمات التخزين السحابي:</strong> حفظ البيانات بأمان</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>التواصل بخصوص الخصوصية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                إذا كان لديك أي أسئلة حول سياسة الخصوصية أو تريد ممارسة حقوقك:
              </p>
              <div className="space-y-2">
                <p><strong>مسؤول حماية البيانات:</strong> privacy@adrina.sa</p>
                <p><strong>الهاتف:</strong> +966 11 123 4567</p>
                <p><strong>العنوان:</strong> الرياض، المملكة العربية السعودية</p>
              </div>
            </CardContent>
          </Card>

          {/* Updates Notice */}
          <Alert>
            <AlertDescription>
              سنقوم بإشعارك عبر البريد الإلكتروني أو من خلال المنصة بأي تغييرات مهمة في سياسة الخصوصية. 
              استمرار استخدامك للمنصة بعد التحديثات يعني موافقتك على السياسة المحدثة.
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;