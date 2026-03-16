import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroPanoImg from '@/assets/hero-panoramic.jpg';

const HeroSection = () => {
  const { language, isRTL } = useLanguageContext();

  const t = language === 'ar' ? {
    headline1: 'في',
    brandName: 'هواية',
    headline2: 'مرحب بك دائماً..',
    headline3: 'هنا قصتك تكمل مع ناس تشبهك..',
    joinNow: 'انضم الآن',
    browseServices: 'تصفح الخدمات',
  } : {
    headline1: 'At',
    brandName: 'Hiwaya',
    headline2: "you're always welcome..",
    headline3: 'Your story continues with like-minded people..',
    joinNow: 'Join Now',
    browseServices: 'Browse Services',
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className={`absolute inset-0 bg-gradient-to-${isRTL ? 'l' : 'r'} from-black/60 via-transparent to-transparent`} />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-16 lg:pb-20 min-h-[75vh] lg:min-h-[80vh]">
        <div className="max-w-2xl">
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
            className="flex flex-col sm:flex-row gap-3"
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
        </div>
      </div>

      {/* Bottom solid accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-lime z-20" />
    </section>
  );
};

export default HeroSection;
