import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mountain, Instagram, Youtube, Facebook } from "lucide-react";
import { XIcon } from "@/components/Layout/XIcon";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

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

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.42.42 0 01.45.045c.12.09.18.227.18.365 0 .45-.479.675-1.004.88-.09.03-.18.06-.27.096l-.12.045c-.285.12-.57.255-.795.465a.825.825 0 00-.255.555c-.015.15-.015.27 0 .39.015.3.03.585.045.865.135 2.25.3 5.04-1.05 6.405-.585.585-1.275.885-2.04 1.095a4.6 4.6 0 01-1.23.195c-.435 0-.93-.06-1.545-.195-.21-.045-.42-.06-.615-.075a4.695 4.695 0 00-.75 0c-.195.015-.405.03-.615.075-.615.135-1.11.195-1.545.195a4.6 4.6 0 01-1.23-.195c-.765-.21-1.455-.51-2.04-1.095-1.35-1.365-1.185-4.155-1.05-6.405.015-.28.03-.565.045-.865.015-.12.015-.24 0-.39a.825.825 0 00-.255-.555c-.225-.21-.51-.345-.795-.465l-.12-.045c-.09-.036-.18-.066-.27-.096-.525-.205-1.004-.43-1.004-.88 0-.138.06-.275.18-.365a.42.42 0 01.45-.045c.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.66 1.069 11.016.793 12.006.793h.2z"/>
  </svg>
);

const Footer = () => {
  const { language } = useLanguageContext();
  const isArabic = language === 'ar';
  const [socialSettings, setSocialSettings] = useState<SocialMediaSettings | null>(null);

  useEffect(() => {
    loadSocialSettings();
  }, []);

  const loadSocialSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', 'social_media')
        .single();

      if (data?.value) {
        setSocialSettings(data.value as SocialMediaSettings);
      }
    } catch (error) {
      console.error('Error loading social settings:', error);
    }
  };

  const translations = {
    ar: {
      brand: 'هواية',
      tagline: 'منصة الأنشطة الخارجية والمغامرات الرائدة في المملكة العربية السعودية',
      quickLinks: 'روابط سريعة',
      exploreGroups: 'استكشاف المجموعات',
      services: 'الخدمات',
      offerService: 'قدّم خدمتك',
      support: 'الدعم',
      helpCenter: 'مركز المساعدة',
      contactUs: 'تواصل معنا',
      safetyGuidelines: 'إرشادات السلامة',
      legal: 'قانوني',
      termsConditions: 'الشروط والأحكام',
      privacyPolicy: 'سياسة الخصوصية',
      refundPolicy: 'سياسة الاسترداد',
      copyright: '© {year} هواية. جميع الحقوق محفوظة.',
    },
    en: {
      brand: 'Hewaya',
      tagline: 'The leading outdoor activities and adventures platform in Saudi Arabia',
      quickLinks: 'Quick Links',
      exploreGroups: 'Explore Groups',
      services: 'Services',
      offerService: 'Offer Your Service',
      support: 'Support',
      helpCenter: 'Help Center',
      contactUs: 'Contact Us',
      safetyGuidelines: 'Safety Guidelines',
      legal: 'Legal',
      termsConditions: 'Terms & Conditions',
      privacyPolicy: 'Privacy Policy',
      refundPolicy: 'Refund Policy',
      copyright: '© {year} Hewaya. All rights reserved.',
    }
  };

  const t = isArabic ? translations.ar : translations.en;

  // Render social icons based on settings
  const renderSocialIcons = () => {
    const icons = [];

    // Instagram
    if (!socialSettings || socialSettings.instagram?.visible !== false) {
      icons.push(
        <a 
          key="instagram" 
          href={socialSettings?.instagram?.url || 'https://instagram.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    // Twitter/X
    if (!socialSettings || socialSettings.twitter?.visible !== false) {
      icons.push(
        <a 
          key="twitter" 
          href={socialSettings?.twitter?.url || 'https://x.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="X (Twitter)"
        >
          <XIcon className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    // TikTok
    if (!socialSettings || socialSettings.tiktok?.visible !== false) {
      icons.push(
        <a 
          key="tiktok" 
          href={socialSettings?.tiktok?.url || 'https://tiktok.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="TikTok"
        >
          <TikTokIcon className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    // YouTube
    if (socialSettings?.youtube?.visible) {
      icons.push(
        <a 
          key="youtube" 
          href={socialSettings.youtube.url || 'https://youtube.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="YouTube"
        >
          <Youtube className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    // Facebook
    if (socialSettings?.facebook?.visible) {
      icons.push(
        <a 
          key="facebook" 
          href={socialSettings.facebook.url || 'https://facebook.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="Facebook"
        >
          <Facebook className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    // Snapchat
    if (socialSettings?.snapchat?.visible) {
      icons.push(
        <a 
          key="snapchat" 
          href={socialSettings.snapchat.url || 'https://snapchat.com'} 
          target="_blank" 
          rel="noopener noreferrer" 
          aria-label="Snapchat"
        >
          <SnapchatIcon className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
        </a>
      );
    }

    return icons;
  };

  return (
    <footer className="bg-secondary border-t mt-auto shrink-0">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg hero-gradient">
                <Mountain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">{t.brand}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.tagline}
            </p>
            <div className="flex space-x-4 rtl:space-x-reverse">
              {renderSocialIcons()}
            </div>
          </div>

          {/* Quick Links */}
          <div className={isArabic ? 'text-right' : 'text-left'}>
            <h3 className="font-semibold mb-4">{t.quickLinks}</h3>
            <ul className="space-y-2">
              <li><Link to="/groups/discover-groups" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.exploreGroups}</Link></li>
              <li><Link to="/services" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.services}</Link></li>
              <li><Link to="/create-service" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.offerService}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className={isArabic ? 'text-right' : 'text-left'}>
            <h3 className="font-semibold mb-4">{t.support}</h3>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.helpCenter}</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.contactUs}</Link></li>
              <li><Link to="/safety" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.safetyGuidelines}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className={isArabic ? 'text-right' : 'text-left'}>
            <h3 className="font-semibold mb-4">{t.legal}</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.termsConditions}</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.privacyPolicy}</Link></li>
              <li><Link to="/refund" className="text-sm text-muted-foreground hover:text-primary smooth-transition">{t.refundPolicy}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t.copyright.replace('{year}', new Date().getFullYear().toString())}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
