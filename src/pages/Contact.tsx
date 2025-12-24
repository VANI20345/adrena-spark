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
import { useLanguageContext } from "@/contexts/LanguageContext";

const Contact = () => {
  const { t, isRTL, language } = useLanguageContext();
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
    toast({
      title: t('contact.successTitle'),
      description: t('contact.successDesc'),
    });
    setFormData({ name: "", email: "", subject: "", message: "", category: "" });
  };

  const contactInfo = [
    {
      icon: Phone,
      title: t('contact.phone'),
      details: ["+966 11 123 4567", "+966 11 123 4568"],
      description: t('contact.phoneDesc')
    },
    {
      icon: Mail,
      title: t('contact.email'),
      details: ["info@hewaya.sa", "support@hewaya.sa"],
      description: t('contact.emailDesc')
    },
    {
      icon: MapPin,
      title: t('contact.addressTitle'),
      details: language === 'ar' 
        ? ["الرياض، المملكة العربية السعودية", "طريق الملك فهد، حي العليا"]
        : ["Riyadh, Saudi Arabia", "King Fahd Road, Olaya District"],
      description: t('contact.addressDesc')
    },
    {
      icon: Clock,
      title: t('contact.workingHours'),
      details: language === 'ar'
        ? ["الأحد - الخميس: 9:00 ص - 6:00 م", "الجمعة - السبت: مغلق"]
        : ["Sun - Thu: 9:00 AM - 6:00 PM", "Fri - Sat: Closed"],
      description: t('contact.workingHoursDesc')
    }
  ];

  const inquiryTypes = language === 'ar' ? [
    { value: "general", label: "استفسار عام" },
    { value: "booking", label: "حجز فعالية" },
    { value: "technical", label: "مشكلة تقنية" },
    { value: "organizer", label: "أريد أن أصبح منظم" },
    { value: "provider", label: "أريد تقديم خدمة" },
    { value: "partnership", label: "شراكة" }
  ] : [
    { value: "general", label: "General Inquiry" },
    { value: "booking", label: "Event Booking" },
    { value: "technical", label: "Technical Issue" },
    { value: "organizer", label: "Become an Organizer" },
    { value: "provider", label: "Provide a Service" },
    { value: "partnership", label: "Partnership" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`text-center mb-12 ${isRTL ? 'text-right' : 'text-left'} md:text-center`}>
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('contact.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('contact.sendMessage')}</CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t('contact.formDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact.fullName')}</label>
                  <Input
                    placeholder={t('contact.fullNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact.emailLabel')}</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact.inquiryType')}</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('contact.selectInquiryType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {inquiryTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact.subject')}</label>
                  <Input
                    placeholder={t('contact.subjectPlaceholder')}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact.message')}</label>
                  <Textarea
                    placeholder={t('contact.messagePlaceholder')}
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('contact.send')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg hero-gradient">
                      <info.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('contact.followUs')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('contact.followUsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://x.com/" target="_blank" rel="noopener noreferrer">
                      {t('contact.twitter')}
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer">
                      {t('contact.instagram')}
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer">
                      {t('contact.youtube')}
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