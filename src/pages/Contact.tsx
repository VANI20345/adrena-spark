import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Loader2, Youtube, Instagram, Facebook } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { XIcon } from "@/components/Layout/XIcon";

// Custom icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.42.42 0 01.45.045c.12.09.18.227.18.365 0 .45-.479.675-1.004.88-.09.03-.18.06-.27.096l-.12.045c-.285.12-.57.255-.795.465a.825.825 0 00-.255.555c-.015.15-.015.27 0 .39.015.3.03.585.045.865.135 2.25.3 5.04-1.05 6.405-.585.585-1.275.885-2.04 1.095a4.6 4.6 0 01-1.23.195c-.435 0-.93-.06-1.545-.195-.21-.045-.42-.06-.615-.075a4.695 4.695 0 00-.75 0c-.195.015-.405.03-.615.075-.615.135-1.11.195-1.545.195a4.6 4.6 0 01-1.23-.195c-.765-.21-1.455-.51-2.04-1.095-1.35-1.365-1.185-4.155-1.05-6.405.015-.28.03-.565.045-.865.015-.12.015-.24 0-.39a.825.825 0 00-.255-.555c-.225-.21-.51-.345-.795-.465l-.12-.045c-.09-.036-.18-.066-.27-.096-.525-.205-1.004-.43-1.004-.88 0-.138.06-.275.18-.365a.42.42 0 01.45-.045c.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.66 1.069 11.016.793 12.006.793h.2z"/>
  </svg>
);

interface SocialPlatformSettings {
  url: string;
  visible: boolean;
}

interface SocialMediaSettings {
  youtube?: SocialPlatformSettings;
  tiktok?: SocialPlatformSettings;
  instagram?: SocialPlatformSettings;
  snapchat?: SocialPlatformSettings;
  twitter?: SocialPlatformSettings;
  facebook?: SocialPlatformSettings;
}

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_address: { ar: string; en: string };
  contact_working_hours: { 
    ar: { weekdays: string; weekend: string }; 
    en: { weekdays: string; weekend: string };
  };
}

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
  const [loading, setLoading] = useState(true);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [socialSettings, setSocialSettings] = useState<SocialMediaSettings | null>(null);

  useEffect(() => {
    loadContactSettings();
  }, []);

  const loadContactSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['contact_phone', 'contact_email', 'contact_address', 'contact_working_hours', 'social_media']);

      if (error) throw error;

      const settings = data?.reduce((acc: any, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setContactSettings({
        contact_phone: settings?.contact_phone || { primary: '+966 11 123 4567', secondary: '+966 11 123 4568' },
        contact_email: settings?.contact_email || { primary: 'info@hiwaya.sa', secondary: 'support@hiwaya.sa' },
        contact_address: settings?.contact_address || { ar: 'الرياض، المملكة العربية السعودية', en: 'Riyadh, Saudi Arabia' },
        contact_working_hours: settings?.contact_working_hours || { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: 'الجمعة - السبت: مغلق' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: 'Fri - Sat: Closed' }
        },
      });
      
      // Set social media settings separately
      if (settings?.social_media) {
        setSocialSettings(settings.social_media);
      }
    } catch (error) {
      console.error('Error loading contact settings:', error);
      // Use fallback values
      setContactSettings({
        contact_phone: { primary: '+966 11 123 4567', secondary: '+966 11 123 4568' },
        contact_email: { primary: 'info@hiwaya.sa', secondary: 'support@hiwaya.sa' },
        contact_address: { ar: 'الرياض، المملكة العربية السعودية', en: 'Riyadh, Saudi Arabia' },
        contact_working_hours: { 
          ar: { weekdays: 'الأحد - الخميس: 9:00 ص - 6:00 م', weekend: 'الجمعة - السبت: مغلق' },
          en: { weekdays: 'Sun - Thu: 9:00 AM - 6:00 PM', weekend: 'Fri - Sat: Closed' }
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        category: formData.category || 'general'
      });

      if (error) throw error;

      toast({
        title: t('contact.successTitle'),
        description: t('contact.successDesc'),
      });
      setFormData({ name: "", email: "", subject: "", message: "", category: "" });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ أثناء إرسال الرسالة' : 'Error sending message',
        variant: 'destructive'
      });
    }
  };

  const contactInfo = contactSettings ? [
    {
      icon: Phone,
      title: t('contact.phone'),
      details: [contactSettings.contact_phone.primary, contactSettings.contact_phone.secondary].filter(Boolean),
      description: t('contact.phoneDesc')
    },
    {
      icon: Mail,
      title: t('contact.email'),
      details: [contactSettings.contact_email.primary, contactSettings.contact_email.secondary].filter(Boolean),
      description: t('contact.emailDesc')
    },
    {
      icon: MapPin,
      title: t('contact.addressTitle'),
      details: [language === 'ar' ? contactSettings.contact_address.ar : contactSettings.contact_address.en],
      description: t('contact.addressDesc')
    },
    {
      icon: Clock,
      title: t('contact.workingHours'),
      details: language === 'ar' 
        ? [contactSettings.contact_working_hours.ar.weekdays, contactSettings.contact_working_hours.ar.weekend]
        : [contactSettings.contact_working_hours.en.weekdays, contactSettings.contact_working_hours.en.weekend],
      description: t('contact.workingHoursDesc')
    }
  ] : [];

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
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} dir={isRTL ? 'rtl' : 'ltr'}>
                    <SelectTrigger className={isRTL ? '[&>span]:text-right [&>span]:flex-1 flex-row-reverse' : 'text-left'}>
                      <SelectValue placeholder={t('contact.selectInquiryType')} />
                    </SelectTrigger>
                    <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                      {inquiryTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className={isRTL ? 'text-right flex-row-reverse justify-end' : 'text-left'}>{type.label}</SelectItem>
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

            {/* Social Media - Now uses dynamic social_media settings */}
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>{t('contact.followUs')}</CardTitle>
                <CardDescription className={isRTL ? 'text-right' : 'text-left'}>{t('contact.followUsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  {socialSettings?.twitter?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.twitter.url || '#'} target="_blank" rel="noopener noreferrer">
                        <XIcon className="w-4 h-4" />
                        <span>X</span>
                      </a>
                    </Button>
                  )}
                  {socialSettings?.instagram?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.instagram.url || '#'} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    </Button>
                  )}
                  {socialSettings?.youtube?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.youtube.url || '#'} target="_blank" rel="noopener noreferrer">
                        <Youtube className="w-4 h-4" />
                        <span>YouTube</span>
                      </a>
                    </Button>
                  )}
                  {socialSettings?.tiktok?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.tiktok.url || '#'} target="_blank" rel="noopener noreferrer">
                        <TikTokIcon className="w-4 h-4" />
                        <span>TikTok</span>
                      </a>
                    </Button>
                  )}
                  {socialSettings?.facebook?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.facebook.url || '#'} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-4 h-4" />
                        <span>Facebook</span>
                      </a>
                    </Button>
                  )}
                  {socialSettings?.snapchat?.visible && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
                      <a href={socialSettings.snapchat.url || '#'} target="_blank" rel="noopener noreferrer">
                        <SnapchatIcon className="w-4 h-4" />
                        <span>Snapchat</span>
                      </a>
                    </Button>
                  )}
                  {/* Fallback message if no social links are enabled or all are hidden */}
                  {(!socialSettings || (
                    !socialSettings.twitter?.visible &&
                    !socialSettings.instagram?.visible &&
                    !socialSettings.youtube?.visible &&
                    !socialSettings.tiktok?.visible &&
                    !socialSettings.facebook?.visible &&
                    !socialSettings.snapchat?.visible
                  )) && (
                    <p className="text-muted-foreground text-sm">
                      {isRTL ? 'لم يتم تفعيل روابط التواصل الاجتماعي بعد' : 'Social media links not configured yet'}
                    </p>
                  )}
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