import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

// Import category images for the collage
import hikingImg from '@/assets/categories/hiking.jpg';
import climbingImg from '@/assets/categories/climbing.jpg';
import kayakingImg from '@/assets/categories/kayaking.jpg';
import campingImg from '@/assets/categories/camping.jpg';
import desertImg from '@/assets/categories/desert.jpg';
import bikingImg from '@/assets/categories/biking.jpg';
import logoImg from '@/assets/adrena_logo.png';

const FloatingPill = ({ 
  children, 
  delay = 0,
  color,
  className,
}: { 
  children: React.ReactNode; 
  delay?: number;
  color: 'lime' | 'purple' | 'orange' | 'teal';
  className?: string;
}) => {
  const colorMap = {
    lime: 'bg-[hsl(var(--brand-lime))] text-[hsl(var(--brand-lime-foreground))]',
    purple: 'bg-[hsl(var(--brand-purple))] text-[hsl(var(--brand-purple-foreground))]',
    orange: 'bg-[hsl(var(--brand-orange))] text-[hsl(var(--brand-orange-foreground))]',
    teal: 'bg-[hsl(var(--brand-teal))] text-[hsl(var(--brand-teal-foreground))]',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${colorMap[color]} ${className || ''}`}
    >
      {children}
    </motion.span>
  );
};

const HeroSection = () => {
  const { language, isRTL } = useLanguageContext();

  const t = language === 'ar' ? {
    headline1: 'في',
    brandName: 'هواية',
    headline2: 'مرحب بك دائماً..',
    headline3: 'هنا قصتك تكمل مع ناس تشبهك..',
    joinNow: 'انضم الآن',
    browseServices: 'تصفح الخدمات',
    pillShare: 'شارك',
    pillExplore: 'استكشف',
    pillPlay: 'العب',
    pillDiscover: 'اكتشف',
  } : {
    headline1: 'At',
    brandName: 'Hiwaya',
    headline2: "you're always welcome..",
    headline3: 'Your story continues with like-minded people..',
    joinNow: 'Join Now',
    browseServices: 'Browse Services',
    pillShare: 'Share',
    pillExplore: 'Explore',
    pillPlay: 'Play',
    pillDiscover: 'Discover',
  };

  const collageImages = [
    { src: hikingImg, alt: 'Hiking' },
    { src: climbingImg, alt: 'Climbing' },
    { src: kayakingImg, alt: 'Kayaking' },
    { src: campingImg, alt: 'Camping' },
    { src: desertImg, alt: 'Desert' },
    { src: bikingImg, alt: 'Biking' },
  ];

  return (
    <div className="relative bg-background overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Decorative orange starburst - top corner */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute top-0 ltr:right-0 rtl:left-0 w-28 h-28 md:w-40 md:h-40 z-0"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-[hsl(var(--brand-orange))]" fill="currentColor" opacity="0.35">
          <path d="M100,0 L120,80 L200,100 L120,120 L100,200 L80,120 L0,100 L80,80 Z" />
        </svg>
      </motion.div>

      {/* Small teal circle accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-16 ltr:left-10 rtl:right-10 w-5 h-5 rounded-full bg-[hsl(var(--brand-teal))] hidden md:block"
      />

      {/* Small lime dot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="absolute top-1/3 ltr:left-[5%] rtl:right-[5%] w-3 h-3 rounded-full bg-[hsl(var(--brand-lime))] hidden lg:block"
      />

      <div className="container mx-auto px-4 py-10 md:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Photo Collage */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="relative order-2 lg:order-1"
          >
            <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto lg:mx-0">
              {collageImages.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className={`rounded-2xl overflow-hidden shadow-lg ${
                    i === 0 ? 'col-span-2 row-span-2 h-48 md:h-60' :
                    i === 1 ? 'h-[5.5rem] md:h-[7rem]' :
                    i === 2 ? 'h-[5.5rem] md:h-[7rem]' :
                    i === 3 ? 'h-28 md:h-32' :
                    'h-28 md:h-32'
                  }`}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>

            {/* Brand logo overlay card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -bottom-3 ltr:right-4 rtl:left-4 bg-[hsl(var(--brand-gold))] rounded-xl p-2.5 shadow-xl z-10"
            >
              <img src={logoImg} alt="Hiwaya" className="w-10 h-10 object-contain" />
            </motion.div>

            {/* Floating pills over the collage */}
            <div className="absolute -top-2 ltr:right-4 rtl:left-4 z-10">
              <FloatingPill color="purple" delay={0.6}>{t.pillShare}</FloatingPill>
            </div>
            <div className="absolute bottom-10 ltr:-left-1 rtl:-right-1 z-10">
              <FloatingPill color="lime" delay={0.8}>{t.pillExplore}</FloatingPill>
            </div>
            <div className="absolute top-1/2 ltr:-right-3 rtl:-left-3 z-10 hidden md:block">
              <FloatingPill color="orange" delay={1.0}>{t.pillPlay}</FloatingPill>
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="order-1 lg:order-2 text-center lg:text-start"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.2] mb-6 text-foreground">
              {t.headline1}{' '}
              <span className="text-[hsl(var(--brand-lime))]">
                {t.brandName}
              </span>
              <br />
              {t.headline2}
              <br />
              <span className="text-primary">{t.headline3}</span>
            </h1>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button
                size="lg"
                className="text-base px-6 h-12 rounded-xl font-semibold"
                variant="brand"
                asChild
              >
                <Link to="/groups/discover-groups">
                  {t.joinNow}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-6 h-12 rounded-xl border-primary/30 hover:border-primary"
                asChild
              >
                <Link to="/services">
                  {t.browseServices}
                </Link>
              </Button>
            </div>

            {/* Floating discover pill below CTA */}
            <div className="mt-5 hidden lg:block">
              <FloatingPill color="teal" delay={1.2}>{t.pillDiscover}</FloatingPill>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom brand accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-[hsl(var(--brand-lime))] to-[hsl(var(--brand-orange))]" />
    </div>
  );
};

export default HeroSection;
