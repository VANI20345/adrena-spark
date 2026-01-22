import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, Clock, Globe, Save, Loader2 } from 'lucide-react';

interface ContactSettings {
  contact_phone: { primary: string; secondary: string };
  contact_email: { primary: string; secondary: string };
  contact_address: { ar: string; en: string };
  contact_working_hours: { 
    ar: { weekdays: string; weekend: string }; 
    en: { weekdays: string; weekend: string };
  };
  social_links: { twitter: string; instagram: string; youtube: string };
}

export const ContactSettingsTab: React.FC = () => {
  const { language, t } = useLanguageContext();
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
    },
    social_links: { twitter: '', instagram: '', youtube: '' }
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
        },
        social_links: allSettings.social_links || { twitter: '', instagram: '', youtube: '' }
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
        adminService.updateSystemSetting('social_links', settings.social_links),
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'إعدادات التواصل' : 'Contact Settings'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة معلومات التواصل التي تظهر في صفحة اتصل بنا' : 'Manage contact information shown on the Contact Us page'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className={isRTL ? 'mr-2' : 'ml-2'}>
            {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
          </span>
        </Button>
      </div>

      {/* Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {isRTL ? 'أرقام الهاتف' : 'Phone Numbers'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'أرقام الهاتف الرسمية للمنصة' : 'Official platform phone numbers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{isRTL ? 'الرقم الرئيسي' : 'Primary Number'}</Label>
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
            <Label>{isRTL ? 'الرقم الثانوي' : 'Secondary Number'}</Label>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isRTL ? 'البريد الإلكتروني' : 'Email Addresses'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'عناوين البريد الإلكتروني الرسمية' : 'Official email addresses'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{isRTL ? 'البريد الرئيسي' : 'Primary Email'}</Label>
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
            <Label>{isRTL ? 'بريد الدعم' : 'Support Email'}</Label>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {isRTL ? 'العنوان' : 'Address'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'العنوان الفعلي للمنصة' : 'Physical address of the platform'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{isRTL ? 'العنوان (عربي)' : 'Address (Arabic)'}</Label>
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
            <Label>{isRTL ? 'العنوان (إنجليزي)' : 'Address (English)'}</Label>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isRTL ? 'ساعات العمل' : 'Working Hours'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'أوقات العمل الرسمية' : 'Official working hours'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-medium">{isRTL ? 'بالعربية' : 'In Arabic'}</h4>
              <div className="space-y-2">
                <Label>{isRTL ? 'أيام العمل' : 'Weekdays'}</Label>
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
                <Label>{isRTL ? 'نهاية الأسبوع' : 'Weekend'}</Label>
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
              <h4 className="font-medium">{isRTL ? 'بالإنجليزية' : 'In English'}</h4>
              <div className="space-y-2">
                <Label>{isRTL ? 'أيام العمل' : 'Weekdays'}</Label>
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
                <Label>{isRTL ? 'نهاية الأسبوع' : 'Weekend'}</Label>
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

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {isRTL ? 'روابط التواصل الاجتماعي' : 'Social Media Links'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'روابط حسابات المنصة على وسائل التواصل' : 'Platform social media account links'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input
              value={settings.social_links.twitter}
              onChange={(e) => setSettings({
                ...settings,
                social_links: { ...settings.social_links, twitter: e.target.value }
              })}
              placeholder="https://x.com/yourhandle"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              value={settings.social_links.instagram}
              onChange={(e) => setSettings({
                ...settings,
                social_links: { ...settings.social_links, instagram: e.target.value }
              })}
              placeholder="https://instagram.com/yourhandle"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>YouTube</Label>
            <Input
              value={settings.social_links.youtube}
              onChange={(e) => setSettings({
                ...settings,
                social_links: { ...settings.social_links, youtube: e.target.value }
              })}
              placeholder="https://youtube.com/@yourchannel"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactSettingsTab;
