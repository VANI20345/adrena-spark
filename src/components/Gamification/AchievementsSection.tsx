import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Trophy, Star, Sparkles, ChevronRight, Lock } from 'lucide-react';
import { BadgeDisplay, ShieldBadge } from './BadgeDisplay';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AchievementsSectionProps {
  userBadges: any[];
  isShieldMember?: boolean;
  totalPoints?: number;
  className?: string;
}

// Placeholder locked badges for users without achievements
const LOCKED_BADGES = [
  { id: 'locked-1', name: 'First Steps', name_ar: 'الخطوة الأولى', icon_name: 'award', rarity: 'common' },
  { id: 'locked-2', name: 'Explorer', name_ar: 'المستكشف', icon_name: 'compass', rarity: 'rare' },
  { id: 'locked-3', name: 'Champion', name_ar: 'البطل', icon_name: 'trophy', rarity: 'epic' },
];

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  userBadges = [],
  isShieldMember = false,
  totalPoints = 0,
  className
}) => {
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const hasAnyAchievements = userBadges.length > 0 || isShieldMember;
  const displayBadges = userBadges.length > 0 ? userBadges : [];
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-full bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                {hasAnyAchievements && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                  </motion.div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {isRTL ? 'الإنجازات والشارات' : 'Achievements & Badges'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? `${userBadges.length} شارة مكتسبة`
                    : `${userBadges.length} badge${userBadges.length !== 1 ? 's' : ''} earned`
                  }
                </p>
              </div>
            </div>
            
            {/* Points display */}
            {totalPoints > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                <Star className="h-3 w-3 fill-yellow-500" />
                {totalPoints} {isRTL ? 'نقطة' : 'pts'}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges Display */}
        <div className="p-4">
          {/* Shield Member Badge - Always prominent if exists */}
          {isShieldMember && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4"
            >
              <ShieldBadge size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {isRTL ? 'عضو الدرع' : 'Shield Member'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'من أوائل 1000 مستخدم' : 'Among first 1000 users'}
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </motion.div>
          )}

          {/* Earned Badges */}
          {displayBadges.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              <AnimatePresence>
                {displayBadges.map((ub: any, index: number) => (
                  <motion.div
                    key={ub.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBadge(ub.id)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    <div className="flex flex-col items-center">
                      <BadgeDisplay badge={ub.badges} size="md" showTooltip={false} />
                      <p className="text-[10px] text-center mt-1 text-muted-foreground truncate w-full">
                        {isRTL ? ub.badges?.name_ar : ub.badges?.name}
                      </p>
                    </div>
                    
                    {/* Hover glow effect */}
                    {hoveredBadge === ub.id && (
                      <motion.div
                        layoutId="badge-glow"
                        className="absolute inset-0 -z-10 rounded-lg bg-primary/10 blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* Empty state with locked badges preview */
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? 'ابدأ رحلتك للحصول على الشارات!'
                    : 'Start your journey to earn badges!'
                  }
                </p>
              </div>
              
              {/* Locked badges preview */}
              <div className="flex justify-center gap-4">
                {LOCKED_BADGES.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center opacity-50"
                  >
                    <div className="relative p-3 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-center mt-1 text-muted-foreground">
                      {isRTL ? badge.name_ar : badge.name}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Call to action */}
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs gap-1"
                  onClick={() => navigate('/achievements')}
                >
                  {isRTL ? 'اكتشف كيف تحصل على الشارات' : 'Discover how to earn badges'}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* View all button if many badges */}
          {displayBadges.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/achievements')}>
                {isRTL ? 'عرض الكل' : 'View All'}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsSection;
