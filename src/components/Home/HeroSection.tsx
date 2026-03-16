import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Compass, Users, Sparkles } from 'lucide-react';
import heroPanoImg from '@/assets/hero-panoramic.jpg';
import logoImg from '@/assets/adrena_logo.png';

const HeroSection = () => {
  const { language, isRTL } = useLanguageContext();

  const t = language === 'ar' ? {
    headline1: 'في',
    brandName: 'هواية',
    headline2: 'مرحب بك دائماً..',
    headline3: 'هنا قصتك تكمل مع ناس تشبهك..',
    joinNow: 'انضم الآن',
    browseServices: 'تصفح الخدمات',
    statGroups: 'مجموعة نشطة',
    statActivities: 'نشاط متاح',
    statMembers: 'عضو مشارك',
  } : {
    headline1: 'At',
    brandName: 'Hiwaya',
    headline2: "you're always welcome..",
    headline3: 'Your story continues with like-minded people..',
    joinNow: 'Join Now',
    browseServices: 'Browse Services',
    statGroups: 'Active Groups',
    statActivities: 'Activities',
    statMembers: 'Members',
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[75vh] lg:min-h-[80vh] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Full-width background image */}
      <div className="absolute inset-0">
        <img
          src={heroPanoImg}
          alt="Mountain adventure"
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className={`absolute inset-0 bg-gradient-to-${isRTL ? 'l' : 'r'} from-black/60 via-transparent to-transparent`} />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-16 lg:pb-20 min-h-[75vh] lg:min-h-[80vh]">
        <div className="max-w-2xl">
          {/* Logo badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-gold flex items-center justify-center shadow-lg">
              <img src={logoImg} alt="Hiwaya" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-white/80 font-display text-sm tracking-wider uppercase">
              {language === 'ar' ? 'منصة المغامرات' : 'Adventure Platform'}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] mb-5 text-white"
          >
            {t.headline1}{' '}
            <span className="text-brand-lime">{t.brandName}</span>
            <br />
            <span className="text-white/90">{t.headline2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-base sm:text-lg text-white/70 font-display mb-8 max-w-lg leading-relaxed"
          >
            {t.headline3}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <Button
              size="lg"
              variant="brand"
              className="text-base px-7 h-13 rounded-xl font-semibold gap-2"
              asChild
            >
              <Link to="/groups/discover-groups">
                {t.joinNow}
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="hero"
              className="text-base px-7 h-13 rounded-xl font-medium"
              asChild
            >
              <Link to="/services">
                {t.browseServices}
              </Link>
            </Button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-6 sm:gap-8"
          >
            <StatItem icon={<Users className="w-4 h-4" />} value="50+" label={t.statGroups} />
            <div className="w-px h-8 bg-white/20" />
            <StatItem icon={<Compass className="w-4 h-4" />} value="200+" label={t.statActivities} />
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <div className="hidden sm:block">
              <StatItem icon={<Sparkles className="w-4 h-4" />} value="1K+" label={t.statMembers} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom brand accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-brand-lime to-brand-orange z-20" />
    </section>
  );
};

const StatItem = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="text-brand-lime">{icon}</div>
    <div>
      <p className="text-white font-bold text-sm leading-none">{value}</p>
      <p className="text-white/50 text-xs font-display mt-0.5">{label}</p>
    </div>
  </div>
);

export default HeroSection;
