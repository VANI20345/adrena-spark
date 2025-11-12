import { useState } from "react";
import { ChevronDown, Search, Phone, Mail, MessageCircle, BookOpen, Users, Shield } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
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
  ];

  const supportChannels = [
    {
      icon: Phone,
      title: "الهاتف",
      description: "اتصل بنا مباشرة",
      contact: "+966 11 123 4567",
      hours: "الأحد - الخميس: 9ص - 6م"
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني", 
      description: "راسلنا عبر البريد",
      contact: "support@adrina.sa",
      hours: "نرد خلال 24 ساعة"
    },
    {
      icon: MessageCircle,
      title: "الدردشة المباشرة",
      description: "تحدث معنا فوراً",
      contact: "متاح الآن",
      hours: "24/7"
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.includes(searchQuery) || faq.answer.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">مركز المساعدة</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نحن هنا لمساعدتك. ابحث عن إجابات لأسئلتك أو تواصل معنا مباشرة
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="ابحث عن سؤالك..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12 text-right"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  الأسئلة الشائعة
                </CardTitle>
                <CardDescription>
                  إجابات على أكثر الأسئلة شيوعاً
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
                          className="w-full justify-between p-4 h-auto text-right"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === index ? 'transform rotate-180' : ''}`} />
                          <span className="font-medium">{faq.question}</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 text-muted-foreground">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  تواصل معنا
                </CardTitle>
                <CardDescription>
                  طرق التواصل المختلفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportChannels.map((channel, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
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
              <CardHeader>
                <CardTitle>روابط مفيدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/safety">إرشادات السلامة</a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/terms">الشروط والأحكام</a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/privacy">سياسة الخصوصية</a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <a href="/refund">سياسة الاسترداد</a>
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