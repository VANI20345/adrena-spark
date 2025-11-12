import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    toast({
      title: "تم إرسال رسالتك بنجاح",
      description: "سنتواصل معك في أقرب وقت ممكن",
    });
    setFormData({ name: "", email: "", subject: "", message: "", category: "" });
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "الهاتف",
      details: ["+966 11 123 4567", "+966 11 123 4568"],
      description: "اتصل بنا مباشرة"
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      details: ["info@adrina.sa", "support@adrina.sa"],
      description: "راسلنا عبر البريد"
    },
    {
      icon: MapPin,
      title: "العنوان",
      details: ["الرياض، المملكة العربية السعودية", "طريق الملك فهد، حي العليا"],
      description: "موقعنا الجغرافي"
    },
    {
      icon: Clock,
      title: "ساعات العمل",
      details: ["الأحد - الخميس: 9:00 ص - 6:00 م", "الجمعة - السبت: مغلق"],
      description: "أوقات التواصل"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">تواصل معنا</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نحن متاحون دائماً للإجابة على استفساراتك ومساعدتك
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>أرسل لنا رسالة</CardTitle>
              <CardDescription>
                املأ النموذج أدناه وسنتواصل معك في أقرب وقت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">الاسم الكامل</label>
                  <Input
                    placeholder="أدخل اسمك الكامل"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">نوع الاستفسار</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الاستفسار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">استفسار عام</SelectItem>
                      <SelectItem value="booking">حجز فعالية</SelectItem>
                      <SelectItem value="technical">مشكلة تقنية</SelectItem>
                      <SelectItem value="organizer">أريد أن أصبح منظم</SelectItem>
                      <SelectItem value="provider">أريد تقديم خدمة</SelectItem>
                      <SelectItem value="partnership">شراكة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">الموضوع</label>
                  <Input
                    placeholder="موضوع رسالتك"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">الرسالة</label>
                  <Textarea
                    placeholder="اكتب رسالتك هنا..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className="w-4 h-4 ml-2" />
                  إرسال الرسالة
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg hero-gradient">
                      <info.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{info.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                      {info.details.map((detail, detailIndex) => (
                        <p key={detailIndex} className="text-sm">{detail}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Social Media */}
            <Card>
              <CardHeader>
                <CardTitle>تابعنا على</CardTitle>
                <CardDescription>ابق على اطلاع دائم بآخر الأخبار والفعاليات</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://twitter.com/adrina" target="_blank" rel="noopener noreferrer">
                      تويتر
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://instagram.com/adrina" target="_blank" rel="noopener noreferrer">
                      انستقرام
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://youtube.com/adrina" target="_blank" rel="noopener noreferrer">
                      يوتيوب
                    </a>
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

export default Contact;