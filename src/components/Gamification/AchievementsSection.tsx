import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Trophy, Star, Sparkles, ChevronRight, Lock } from 'lucide-react';
import { BadgeDisplay, ShieldBadge, LockedBadge } from './BadgeDisplay';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AchievementsSectionProps {
  userBadges: any[];
  isOwnProfile?: boolean;
  isShieldMember?: boolean;
  totalPoints?: number;
  className?: string;
}

// Placeholder locked badges with hints for users
const LOCKED_BADGES = [
  { id: 'locked-1', name: 'First Steps', name_ar: 'الخطوة الأولى', hint: 'Complete your first activity booking', hint_ar: 'أكمل حجز أول نشاط لك', rarity: 'common' },
  { id: 'locked-2', name: 'Explorer', name_ar: 'المستكشف', hint: 'Join 3 different interest groups', hint_ar: 'انضم إلى 3 مجموعات اهتمام مختلفة', rarity: 'rare' },
  { id: 'locked-3', name: 'Champion', name_ar: 'البطل', hint: 'Attend 5 confirmed events', hint_ar: 'احضر 5 فعاليات مؤكدة', rarity: 'epic' },
];

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  userBadges = [],
  isShieldMember = false,
  totalPoints = 0,
  isOwnProfile = true,
  className
}) => {
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const hasAnyAchievements = userBadges.length > 0 || isShieldMember;
  const displayBadges = userBadges.length > 0 ? userBadges : [];
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 border-border/60 hover:shadow-md dark:hover:shadow-primary/5",
      className
    )}>
      <CardContent className="p-0">
        {/* Header with vibrant premium gradient */}
        <div className="bg-gradient-to-r from-primary/15 via-brand-purple/5 to-transparent p-5 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2.5 rounded-full bg-primary/10 text-primary shadow-inner">
                  <Trophy className="h-5 w-5" />
                </div>
                {hasAnyAchievements && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                  </motion.div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">
                  {isRTL ? 'الإنجازات والشارات' : 'Achievements & Badges'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL 
                    ? `${userBadges.length} شارة مكتسبة`
                    : `${userBadges.length} badge${userBadges.length !== 1 ? 's' : ''} earned`
                  }
                </p>
              </div>
            </div>
            
            {/* Points display */}
            {totalPoints > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 gap-1 px-2.5 py-1 text-xs font-semibold rounded-full">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {totalPoints} {isRTL ? 'نقطة' : 'pts'}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges Display */}
        <div className="p-5">
          {/* Shield Member Badge - Always prominent if exists */}
          {isShieldMember && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4 shadow-sm"
            >
              <ShieldBadge size="lg" />
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">
                  {isRTL ? 'عضو الدرع (مؤسس)' : 'Shield Member (Founder)'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL ? 'من أوائل 1000 مستخدم في منصة هواية' : 'Among first 1000 users in Hiwaya'}
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500 animate-bounce" />
            </motion.div>
          )}

          {/* Earned Badges */}
          {displayBadges.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
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
                      <BadgeDisplay badge={ub.badges} size="md" showTooltip={true} />
                      <p className="text-[10px] text-center mt-1.5 font-medium text-foreground/80 group-hover:text-primary transition-colors truncate w-full">
                        {isRTL ? ub.badges?.name_ar : ub.badges?.name}
                      </p>
                    </div>
                    
                    {/* Hover glow effect */}
                    {hoveredBadge === ub.id && (
                      <motion.div
                        layoutId="badge-glow"
                        className="absolute inset-0 -z-10 rounded-xl bg-primary/5 blur-md"
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
            /* Empty state - only show CTA for own profile */
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium">
                  {isRTL 
                    ? 'لم تكتسب أي شارات بعد. ابدأ مغامرتك الآن!'
                    : 'No badges earned yet. Start your adventure now!'
                  }
                </p>
              </div>
              
              {/* Only show locked badges and CTA for own profile */}
              {isOwnProfile && (
                <>
                  {/* Locked badges preview using LockedBadge component */}
                  <div className="flex justify-center gap-6">
                    {LOCKED_BADGES.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex flex-col items-center group"
                      >
                        <LockedBadge 
                          size="md" 
                          hint={badge.hint} 
                          hintAr={badge.hint_ar} 
                        />
                        <p className="text-[10px] text-center mt-2 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {isRTL ? badge.name_ar : badge.name}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Call to action */}
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs gap-1.5 rounded-full px-4 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => navigate('/achievements')}
                    >
                      {isRTL ? 'اكتشف كيف تحصل على الشارات' : 'Discover how to earn badges'}
                      <ChevronRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* View all button if many badges */}
          {displayBadges.length > 6 && (
            <div className="mt-5 text-center border-t border-border/30 pt-3">
              <Button variant="ghost" size="sm" className="text-xs gap-1 hover:text-primary rounded-full" onClick={() => navigate('/achievements')}>
                {isRTL ? 'عرض جميع الإنجازات' : 'View All Achievements'}
                <ChevronRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsSection;
