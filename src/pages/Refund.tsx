import { CreditCard, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Refund = () => {
  const lastUpdated = "1 يناير 2024";

  const refundPolicies = [
    {
      type: "إلغاء مبكر (أكثر من 7 أيام)",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "استرداد كامل باستثناء رسوم المعالجة",
      percentage: "95%",
      timeframe: "3-5 أيام عمل"
    },
    {
      type: "إلغاء متوسط (3-7 أيام)",
      icon: AlertCircle,
      color: "text-yellow-600", 
      bgColor: "bg-yellow-100",
      description: "استرداد جزئي حسب سياسة المنظم",
      percentage: "50-80%",
      timeframe: "5-7 أيام عمل"
    },
    {
      type: "إلغاء متأخر (أقل من 3 أيام)",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100", 
      description: "لا يوجد استرداد إلا في حالات استثنائية",
      percentage: "0-25%",
      timeframe: "غير متاح عادة"
    }
  ];

  const exceptionalCases = [
    "إلغاء الفعالية من قبل المنظم",
    "ظروف جوية قاسية أو كوارث طبيعية",
    "حالات طبية طارئة (بتقرير طبي)",
    "ظروف أمنية أو قيود حكومية",
    "خطأ في معلومات الفعالية من المنظم"
  ];

  const refundProcess = [
    {
      step: 1,
      title: "تقديم طلب الاسترداد",
      description: "من خلال لوحة التحكم أو التواصل مع الدعم"
    },
    {
      step: 2,
      title: "مراجعة الطلب", 
      description: "سيتم مراجعة طلبك خلال 24-48 ساعة"
    },
    {
      step: 3,
      title: "الموافقة والمعالجة",
      description: "بعد الموافقة، سيتم بدء عملية الاسترداد"
    },
    {
      step: 4,
      title: "استلام المبلغ",
      description: "سيصل المبلغ إلى حسابك حسب طريقة الدفع"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <RefreshCw className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">سياسة الاسترداد</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            تعرف على شروط وأحكام استرداد الأموال لحجوزاتك
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            آخر تحديث: {lastUpdated}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Important Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>ملاحظة مهمة:</strong> سياسة الاسترداد تختلف حسب نوع الفعالية والمنظم. يرجى قراءة التفاصيل بعناية قبل الحجز.
            </AlertDescription>
          </Alert>

          {/* Refund Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                سياسات الاسترداد حسب وقت الإلغاء
              </CardTitle>
              <CardDescription>
                يعتمد مبلغ الاسترداد على وقت إلغاء الحجز قبل موعد الفعالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {refundPolicies.map((policy, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${policy.bgColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <policy.icon className={`w-5 h-5 ${policy.color}`} />
                      <h3 className="font-semibold text-sm">{policy.type}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                    <div className="flex justify-between items-center">
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
              <CardTitle>الحالات الاستثنائية للاسترداد الكامل</CardTitle>
              <CardDescription>
                في هذه الحالات، يحق لك الحصول على استرداد كامل بغض النظر عن وقت الإلغاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {exceptionalCases.map((case_item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{case_item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Refund Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                خطوات طلب الاسترداد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refundProcess.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full hero-gradient text-white font-semibold text-sm">
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
              <CardTitle>أوقات الاسترداد حسب طريقة الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">طريقة الدفع</th>
                      <th className="text-right p-3">وقت الاسترداد</th>
                      <th className="text-right p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">البطاقات الائتمانية</td>
                      <td className="p-3">3-5 أيام عمل</td>
                      <td className="p-3 text-sm text-muted-foreground">يظهر في كشف الحساب التالي</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">مدى</td>
                      <td className="p-3">1-3 أيام عمل</td>
                      <td className="p-3 text-sm text-muted-foreground">فوري في معظم الحالات</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">STC Pay</td>
                      <td className="p-3">فوري - 24 ساعة</td>
                      <td className="p-3 text-sm text-muted-foreground">سيصل للمحفظة مباشرة</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Apple Pay</td>
                      <td className="p-3">3-5 أيام عمل</td>
                      <td className="p-3 text-sm text-muted-foreground">حسب البنك المرتبط</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fees and Charges */}
          <Card>
            <CardHeader>
              <CardTitle>الرسوم والخصومات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">رسوم المعالجة</h3>
                  <p className="text-sm text-muted-foreground">
                    يتم خصم 5% كرسوم معالجة من أي استرداد (باستثناء الحالات الاستثنائية)
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">رسوم البنك</h3>
                  <p className="text-sm text-muted-foreground">
                    قد تطبق البنوك رسوم إضافية للاسترداد الدولي أو تحويل العملة
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">العروض والخصومات</h3>
                  <p className="text-sm text-muted-foreground">
                    في حالة استخدام كوبون خصم، سيتم استرداد المبلغ المدفوع فعلياً فقط
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact for Refund */}
          <Card>
            <CardHeader>
              <CardTitle>طلب الاسترداد أو الاستفسار</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                إذا كنت تريد طلب استرداد أو لديك استفسار حول سياسة الاسترداد:
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild>
                  <a href="/dashboard">لوحة التحكم</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/contact">تواصل مع الدعم</a>
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                <p><strong>البريد الإلكتروني:</strong> refund@adrina.sa</p>
                <p><strong>الهاتف:</strong> +966 11 123 4567</p>
                <p><strong>ساعات العمل:</strong> الأحد - الخميس: 9:00 ص - 6:00 م</p>
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