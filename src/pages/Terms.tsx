import { FileText, Calendar, Users, CreditCard, Shield, AlertCircle } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Terms = () => {
  const lastUpdated = "1 يناير 2024";

  const sections = [
    {
      icon: Users,
      title: "1. قبول الشروط",
      content: [
        "باستخدام منصة هواية، فإنك توافق على الالتزام بهذه الشروط والأحكام.",
        "إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.",
        "نحتفظ بالحق في تعديل هذه الشروط في أي وقت دون إشعار مسبق.",
        "استمرار استخدامك للمنصة يعني موافقتك على الشروط المعدلة."
      ]
    },
    {
      icon: Calendar,
      title: "2. الحجوزات والفعاليات",
      content: [
        "جميع الحجوزات نهائية ولا يمكن إلغاؤها إلا وفقاً لسياسة الإلغاء المحددة.",
        "يجب دفع كامل المبلغ وقت الحجز ما لم ينص على خلاف ذلك.",
        "المنظمون مسؤولون عن دقة معلومات فعالياتهم.",
        "نحن لسنا مسؤولين عن إلغاء أو تأجيل الفعاليات من قبل المنظمين.",
        "في حالة إلغاء الفعالية، سيتم استرداد المبلغ وفقاً لسياسة الاسترداد."
      ]
    },
    {
      icon: CreditCard,
      title: "3. الدفع والرسوم",
      content: [
        "جميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة.",
        "نتقاضى عمولة من المنظمين ومقدمي الخدمات مقابل استخدام المنصة.",
        "رسوم المعالجة غير قابلة للاسترداد.",
        "في حالة فشل الدفع، سيتم إلغاء الحجز تلقائياً.",
        "نحن لسنا مسؤولين عن أي رسوم إضافية من البنك أو شركة البطاقة الائتمانية."
      ]
    },
    {
      icon: Shield,
      title: "4. المسؤوليات والضمانات",
      content: [
        "نحن نقدم المنصة 'كما هي' دون أي ضمانات صريحة أو ضمنية.",
        "لسنا مسؤولين عن أي أضرار أو إصابات تحدث أثناء الفعاليات.",
        "المنظمون ومقدمو الخدمات مسؤولون بالكامل عن أنشطتهم.",
        "يجب على المشاركين التأكد من ملاءمة الفعالية لقدراتهم الصحية والبدنية.",
        "نوصي بشدة بالحصول على تأمين سفر أو تأمين ضد الحوادث."
      ]
    },
    {
      icon: FileText,
      title: "5. حقوق الملكية الفكرية",
      content: [
        "جميع حقوق الملكية الفكرية للمنصة محفوظة لنا.",
        "لا يحق للمستخدمين نسخ أو إعادة إنتاج محتوى المنصة دون إذن.",
        "المحتوى المرفوع من قبل المستخدمين يبقى ملكاً لهم.",
        "منح المستخدمون ترخيصاً لاستخدام محتواهم على المنصة.",
        "نحتفظ بالحق في إزالة أي محتوى ينتهك حقوق الملكية الفكرية."
      ]
    },
    {
      icon: AlertCircle,
      title: "6. قواعد السلوك",
      content: [
        "يجب على المستخدمين التصرف بطريقة محترمة ومهذبة.",
        "ممنوع نشر محتوى مسيء أو غير قانوني أو مضلل.",
        "ممنوع استخدام المنصة لأغراض تجارية غير مصرح بها.",
        "نحتفظ بالحق في إيقاف أو حذف حسابات المستخدمين المخالفين.",
        "أي نشاط مشبوه أو احتيالي سيتم الإبلاغ عنه للسلطات المختصة."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">الشروط والأحكام</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            اقرأ شروط وأحكام استخدام منصة هواية بعناية
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            آخر تحديث: {lastUpdated}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>مقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                مرحباً بك في هواية، منصة الأنشطة الخارجية والمغامرات في المملكة العربية السعودية. 
                هذه الشروط والأحكام تحكم استخدامك لمنصتنا وخدماتنا. يرجى قراءتها بعناية قبل استخدام المنصة.
              </p>
            </CardContent>
          </Card>

          {/* Terms Sections */}
          {sections.map((section, index) => (
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>التواصل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                إذا كان لديك أي أسئلة حول هذه الشروط والأحكام، يرجى التواصل معنا:
              </p>
              <div className="space-y-2">
                <p><strong>البريد الإلكتروني:</strong> legal@adrina.sa</p>
                <p><strong>الهاتف:</strong> +966 11 123 4567</p>
                <p><strong>العنوان:</strong> الرياض، المملكة العربية السعودية</p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              هذه الشروط والأحكام خاضعة لقوانين المملكة العربية السعودية. 
              أي نزاع ينشأ عن استخدام المنصة سيتم حله وفقاً للقوانين السعودية.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;