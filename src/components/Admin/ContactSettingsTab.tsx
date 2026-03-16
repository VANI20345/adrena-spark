import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, Clock, Save, Loader2 } from 'lucide-react';

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_address: { ar: string; en: string };
  contact_working_hours: { 
    ar: { weekdays: string; weekend: string }; 
    en: { weekdays: string; weekend: string };
  };
}

export const ContactSettingsTab: React.FC = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ContactSettings>({
    contact_phone: { primary: '', secondary: '' },
    contact_email: { primary: '', secondary: '' },
    contact_address: { ar: '', en: '' },
    contact_working_hours: { 
      ar: { weekdays: '', weekend: '' }, 
      en: { weekdays: '', weekend: '' }
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await adminService.getSystemSettings();
      setSettings({
        contact_phone: allSettings.contact_phone || { primary: '', secondary: '' },
        contact_email: allSettings.contact_email || { primary: '', secondary: '' },
        contact_address: allSettings.contact_address || { ar: '', en: '' },
        contact_working_hours: allSettings.contact_working_hours || { 
          ar: { weekdays: '', weekend: '' }, 
          en: { weekdays: '', weekend: '' }
        }
      });
    } catch (error) {
      console.error('Error loading contact settings:', error);
      toast.error(isRTL ? 'خطأ في تحميل الإعدادات' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        adminService.updateSystemSetting('contact_phone', settings.contact_phone),
        adminService.updateSystemSetting('contact_email', settings.contact_email),
        adminService.updateSystemSetting('contact_address', settings.contact_address),
        adminService.updateSystemSetting('contact_working_hours', settings.contact_working_hours),
      ]);
      toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving contact settings:', error);
      toast.error(isRTL ? 'خطأ في حفظ الإعدادات' : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Phone className="h-6 w-6 text-primary" />
            {isRTL ? 'إعدادات التواصل' : 'Contact Settings'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة معلومات التواصل التي تظهر في صفحة اتصل بنا' : 'Manage contact information shown on the Contact Us page'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className={isRTL ? 'flex-row-reverse' : ''}>
          {saving ? (
            <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
          ) : (
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          )}
          <span>
            {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
          </span>
        </Button>
      </div>

      {/* Phone Numbers */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Phone className="h-5 w-5" />
            {isRTL ? 'أرقام الهاتف' : 'Phone Numbers'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'أرقام الهاتف الرسمية للمنصة' : 'Official platform phone numbers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'الرقم الرئيسي' : 'Primary Number'}</Label>
            <Input
              value={settings.contact_phone.primary}
              onChange={(e) => setSettings({
                ...settings,
                contact_phone: { ...settings.contact_phone, primary: e.target.value }
              })}
              placeholder="+966 11 123 4567"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'الرقم الثانوي' : 'Secondary Number'}</Label>
            <Input
              value={settings.contact_phone.secondary}
              onChange={(e) => setSettings({
                ...settings,
                contact_phone: { ...settings.contact_phone, secondary: e.target.value }
              })}
              placeholder="+966 11 123 4568"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Addresses */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Mail className="h-5 w-5" />
            {isRTL ? 'البريد الإلكتروني' : 'Email Addresses'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'عناوين البريد الإلكتروني الرسمية' : 'Official email addresses'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'البريد الرئيسي' : 'Primary Email'}</Label>
            <Input
              type="email"
              value={settings.contact_email.primary}
              onChange={(e) => setSettings({
                ...settings,
                contact_email: { ...settings.contact_email, primary: e.target.value }
              })}
              placeholder="info@hewaya.sa"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'بريد الدعم' : 'Support Email'}</Label>
            <Input
              type="email"
              value={settings.contact_email.secondary}
              onChange={(e) => setSettings({
                ...settings,
                contact_email: { ...settings.contact_email, secondary: e.target.value }
              })}
              placeholder="support@hewaya.sa"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <MapPin className="h-5 w-5" />
            {isRTL ? 'العنوان' : 'Address'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'العنوان الفعلي للمنصة' : 'Physical address of the platform'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'العنوان (عربي)' : 'Address (Arabic)'}</Label>
            <Textarea
              value={settings.contact_address.ar}
              onChange={(e) => setSettings({
                ...settings,
                contact_address: { ...settings.contact_address, ar: e.target.value }
              })}
              placeholder="الرياض، المملكة العربية السعودية"
              dir="rtl"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'العنوان (إنجليزي)' : 'Address (English)'}</Label>
            <Textarea
              value={settings.contact_address.en}
              onChange={(e) => setSettings({
                ...settings,
                contact_address: { ...settings.contact_address, en: e.target.value }
              })}
              placeholder="Riyadh, Saudi Arabia"
              dir="ltr"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Clock className="h-5 w-5" />
            {isRTL ? 'ساعات العمل' : 'Working Hours'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'أوقات العمل الرسمية' : 'Official working hours'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className={`font-medium ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'بالعربية' : 'In Arabic'}</h4>
              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'أيام العمل' : 'Weekdays'}</Label>
                <Input
                  value={settings.contact_working_hours.ar.weekdays}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_working_hours: {
                      ...settings.contact_working_hours,
                      ar: { ...settings.contact_working_hours.ar, weekdays: e.target.value }
                    }
                  })}
                  placeholder="الأحد - الخميس: 9:00 ص - 6:00 م"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'نهاية الأسبوع' : 'Weekend'}</Label>
                <Input
                  value={settings.contact_working_hours.ar.weekend}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_working_hours: {
                      ...settings.contact_working_hours,
                      ar: { ...settings.contact_working_hours.ar, weekend: e.target.value }
                    }
                  })}
                  placeholder="الجمعة - السبت: مغلق"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className={`font-medium ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'بالإنجليزية' : 'In English'}</h4>
              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'أيام العمل' : 'Weekdays'}</Label>
                <Input
                  value={settings.contact_working_hours.en.weekdays}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_working_hours: {
                      ...settings.contact_working_hours,
                      en: { ...settings.contact_working_hours.en, weekdays: e.target.value }
                    }
                  })}
                  placeholder="Sun - Thu: 9:00 AM - 6:00 PM"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'نهاية الأسبوع' : 'Weekend'}</Label>
                <Input
                  value={settings.contact_working_hours.en.weekend}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact_working_hours: {
                      ...settings.contact_working_hours,
                      en: { ...settings.contact_working_hours.en, weekend: e.target.value }
                    }
                  })}
                  placeholder="Fri - Sat: Closed"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSettingsTab;
