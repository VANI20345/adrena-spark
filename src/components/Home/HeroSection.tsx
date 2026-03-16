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
    <section className="relative overflow-hidden bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Text column */}
          <div className={`order-2 lg:order-1 ${isRTL ? 'lg:order-2' : ''}`}>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.15] mb-5 text-foreground"
            >
              {t.headline1}{' '}
              <span className="text-brand-lime">{t.brandName}</span>
              <br />
              <span className="text-foreground/80">{t.headline2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="text-base sm:text-lg text-muted-foreground font-display mb-10 max-w-md leading-relaxed"
            >
              {t.headline3}
            </motion.p>

            {/* CTA Buttons — solid-block colors, no mixing */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                className="text-base px-8 h-13 rounded-xl font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
                className="text-base px-8 h-13 rounded-xl font-medium border-border text-foreground hover:bg-muted"
                asChild
              >
                <Link to="/services">
                  {t.browseServices}
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Image column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`order-1 lg:order-2 ${isRTL ? 'lg:order-1' : ''}`}
          >
            <div className="relative">
              {/* Accent block behind image */}
              <div className="absolute -top-3 ltr:-right-3 rtl:-left-3 w-full h-full rounded-2xl bg-brand-lime/20" />
              <img
                src={heroPanoImg}
                alt="Mountain adventure"
                className="relative z-10 w-full h-[340px] sm:h-[400px] lg:h-[460px] object-cover rounded-2xl shadow-lg"
                loading="eager"
              />
              {/* Small accent dot */}
              <div className="absolute -bottom-4 ltr:left-6 rtl:right-6 w-10 h-10 rounded-full bg-primary z-20" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
