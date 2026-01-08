import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Mountain, Instagram } from "lucide-react";
import { XIcon } from "@/components/Layout/XIcon";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ContactSettings {
  social_links?: { twitter?: string; instagram?: string; youtube?: string };
}

const Footer = () => {
  const { language } = useLanguageContext();
  const isArabic = language === 'ar';
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);

  useEffect(() => {
    loadContactSettings();
  }, []);

  const loadContactSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', 'social_links')
        .single();

      if (data) {
        setContactSettings({ social_links: data.value as ContactSettings['social_links'] });
      }
    } catch (error) {
      console.error('Error loading contact settings:', error);
    }
  };

  const socialLinks = contactSettings?.social_links || {
    twitter: 'https://x.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com'
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
              <a href={socialLinks.instagram || 'https://instagram.com'} target="_blank" rel="noopener noreferrer">
                <Instagram className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
              </a>
              <a href={socialLinks.twitter || 'https://x.com'} target="_blank" rel="noopener noreferrer">
                <XIcon className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5 text-muted-foreground hover:text-primary cursor-pointer smooth-transition" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
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