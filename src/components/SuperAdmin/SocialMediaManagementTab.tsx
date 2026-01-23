import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { Save, Loader2, Globe, Youtube, Instagram, Facebook, Twitter } from 'lucide-react';

// Custom icons for platforms without lucide icons
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

interface SocialMediaPlatform {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  color: string;
}

interface SocialSettings {
  url: string;
  visible: boolean;
}

const platforms: SocialMediaPlatform[] = [
  { id: 'youtube', name: 'YouTube', nameAr: 'يوتيوب', icon: Youtube, placeholder: 'https://youtube.com/@channel', color: 'text-red-600' },
  { id: 'tiktok', name: 'TikTok', nameAr: 'تيك توك', icon: TikTokIcon, placeholder: 'https://tiktok.com/@username', color: 'text-black dark:text-white' },
  { id: 'instagram', name: 'Instagram', nameAr: 'انستغرام', icon: Instagram, placeholder: 'https://instagram.com/username', color: 'text-pink-600' },
  { id: 'snapchat', name: 'Snapchat', nameAr: 'سناب شات', icon: SnapchatIcon, placeholder: 'https://snapchat.com/add/username', color: 'text-yellow-500' },
  { id: 'twitter', name: 'Twitter (X)', nameAr: 'تويتر (X)', icon: Twitter, placeholder: 'https://x.com/username', color: 'text-sky-500' },
  { id: 'facebook', name: 'Facebook', nameAr: 'فيسبوك', icon: Facebook, placeholder: 'https://facebook.com/page', color: 'text-blue-600' },
];

export const SocialMediaManagementTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, SocialSettings>>({});

  const translations = {
    ar: {
      title: 'إدارة وسائل التواصل الاجتماعي',
      description: 'إضافة وتعديل وإظهار/إخفاء روابط وأيقونات وسائل التواصل الاجتماعي',
      saveChanges: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      successSave: 'تم حفظ الإعدادات بنجاح',
      errorSave: 'حدث خطأ أثناء الحفظ',
      errorLoad: 'حدث خطأ أثناء التحميل',
      url: 'الرابط',
      showIcon: 'إظهار الأيقونة',
      preview: 'معاينة',
      visibleIcons: 'الأيقونات المرئية',
      hiddenIcons: 'الأيقونات المخفية',
    },
    en: {
      title: 'Social Media Management',
      description: 'Add, edit, and show/hide social media links and icons',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      successSave: 'Settings saved successfully',
      errorSave: 'Error saving settings',
      errorLoad: 'Error loading settings',
      url: 'URL',
      showIcon: 'Show Icon',
      preview: 'Preview',
      visibleIcons: 'Visible Icons',
      hiddenIcons: 'Hidden Icons',
    },
  };

  const t = translations[language];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await adminService.getSystemSettings();
      const socialMedia = allSettings.social_media || {};
      
      // Initialize settings for all platforms
      const initialSettings: Record<string, SocialSettings> = {};
      platforms.forEach(platform => {
        initialSettings[platform.id] = socialMedia[platform.id] || { url: '', visible: true };
      });
      
      setSettings(initialSettings);
    } catch (error) {
      console.error('Error loading social media settings:', error);
      toast.error(t.errorLoad);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateSystemSetting('social_media', settings);
      toast.success(t.successSave);
    } catch (error) {
      console.error('Error saving social media settings:', error);
      toast.error(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  const updatePlatformSetting = (platformId: string, field: keyof SocialSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value,
      },
    }));
  };

  const visiblePlatforms = platforms.filter(p => settings[p.id]?.visible);
  const hiddenPlatforms = platforms.filter(p => !settings[p.id]?.visible);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className={isRTL ? 'mr-2' : 'ml-2'}>
            {saving ? t.saving : t.saveChanges}
          </span>
        </Button>
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t.preview}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'كيف ستظهر الأيقونات في الموقع' : 'How icons will appear on the website'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {visiblePlatforms.length > 0 ? (
              visiblePlatforms.map(platform => {
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.id}
                    href={settings[platform.id]?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors ${platform.color}`}
                    title={isRTL ? platform.nameAr : platform.name}
                  >
                    <Icon className="h-6 w-6" />
                  </a>
                );
              })
            ) : (
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد أيقونات مرئية' : 'No visible icons'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.visibleIcons}</p>
                <p className="text-3xl font-bold text-green-600">{visiblePlatforms.length}</p>
              </div>
              <Globe className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.hiddenIcons}</p>
                <p className="text-3xl font-bold text-muted-foreground">{hiddenPlatforms.length}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map(platform => {
          const Icon = platform.icon;
          const platformSettings = settings[platform.id] || { url: '', visible: true };

          return (
            <Card key={platform.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${platform.color}`} />
                  {isRTL ? platform.nameAr : platform.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.url}</Label>
                  <Input
                    value={platformSettings.url}
                    onChange={(e) => updatePlatformSetting(platform.id, 'url', e.target.value)}
                    placeholder={platform.placeholder}
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t.showIcon}</Label>
                  <Switch
                    checked={platformSettings.visible}
                    onCheckedChange={(checked) => updatePlatformSetting(platform.id, 'visible', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SocialMediaManagementTab;
