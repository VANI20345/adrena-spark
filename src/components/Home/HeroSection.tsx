import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroImg from '@/assets/hero-new.jpg';
import logoImg from '@/assets/adrena_logo.png';

const HeroSection = () => {
  const { language, isRTL } = useLanguageContext();

  const t = language === 'ar' ? {
    headline1: 'في',
    brandName: 'هواية',
    headline2: 'مرحب بك دائماً..',
    subtitle: 'هنا قصتك تكمل مع ناس تشبهك..',
    joinNow: 'انضم الآن',
    browseServices: 'تصفح الخدمات',
  } : {
    headline1: 'At',
    brandName: 'Hiwaya',
    headline2: "you're always welcome..",
    subtitle: 'Your story continues with like-minded people..',
    joinNow: 'Join Now',
    browseServices: 'Browse Services',
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-0 items-stretch min-h-[70vh]">

          {/* Text Content Side */}
          <div className="flex flex-col justify-center py-16 lg:py-20 order-2 lg:order-1">
            {/* Logo badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                <img src={logoImg} alt="Hiwaya" className="w-7 h-7 object-contain" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.2] mb-5 text-foreground"
            >
              {t.headline1}{' '}
              <span className="text-brand-lime">{t.brandName}</span>
              <br />
              <span className="text-foreground/80">{t.headline2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-base text-muted-foreground font-display mb-10 max-w-md leading-relaxed"
            >
              {t.subtitle}
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
                className="text-base px-8 h-13 rounded-xl font-semibold gap-2 bg-brand-orange text-white hover:bg-brand-orange/90"
                asChild
              >
                <Link to="/groups/discover-groups">
                  {t.joinNow}
                  <ArrowIcon className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-13 rounded-xl font-medium border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                asChild
              >
                <Link to="/services">
                  {t.browseServices}
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative order-1 lg:order-2 flex items-center justify-center py-8 lg:py-12"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Background accent shape */}
              <div className="absolute -top-6 -right-6 w-full h-full rounded-3xl bg-brand-lime/20" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-brand-orange/15" />
              
              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={heroImg}
                  alt="Adventure activities"
                  className="w-full h-[350px] sm:h-[420px] lg:h-[480px] object-cover object-left"
                  loading="eager"
                />
                {/* Subtle overlay for brand tint */}
                <div className="absolute inset-0 bg-primary/5" />
              </div>

              {/* Floating accent pill */}
              <div className="absolute -bottom-3 right-8 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">
                {language === 'ar' ? '🏔️ ابدأ مغامرتك' : '🏔️ Start your adventure'}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom accent bar - single solid color */}
      <div className="h-1 bg-brand-lime w-full" />
    </section>
  );
};

export default HeroSection;
