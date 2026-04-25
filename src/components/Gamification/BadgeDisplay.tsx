import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Award, Crown, Star, Users, Ticket, GraduationCap, Share2, Compass, Mountain, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const iconMap: Record<string, React.ComponentType<any>> = {
  Shield, Award, Crown, Star, Users, Ticket, GraduationCap, Share2, Compass, Mountain
};

interface BadgeDisplayProps {
  badge: {
    id: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon_name?: string;
    rarity?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  isNew?: boolean;
}

const rarityColors: Record<string, string> = {
  common: 'bg-zinc-500/20 text-zinc-600 border-zinc-300 dark:text-zinc-400',
  rare: 'bg-blue-500/20 text-blue-600 border-blue-400 dark:text-blue-400',
  epic: 'bg-purple-500/20 text-purple-600 border-purple-400 dark:text-purple-400',
  legendary: 'bg-gradient-to-br from-amber-400/30 to-orange-500/30 text-amber-600 border-amber-400 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14'
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7'
};

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ 
  badge, 
  size = 'md',
  showTooltip = true,
  isNew = false
}) => {
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const IconComponent = iconMap[badge.icon_name || 'Award'] || Award;
  const rarityClass = rarityColors[badge.rarity || 'common'];

  const handleClick = () => {
    navigate('/achievements');
  };
  
  const badgeElement = (
    <motion.div 
      onClick={handleClick}
      className={cn(
        'rounded-full border-2 flex items-center justify-center relative cursor-pointer transition-all duration-300',
        'hover:scale-110 hover:shadow-lg',
        rarityClass,
        sizeClasses[size]
      )}
      initial={isNew ? { scale: 0, rotate: -180 } : false}
      animate={isNew ? { scale: 1, rotate: 0 } : false}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      whileHover={{ y: -2 }}
    >
      {/* Shiny effect for new badges */}
      {isNew && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
        />
      )}
      <IconComponent className={cn(iconSizes[size], 'relative z-10')} />
    </motion.div>
  );
  
  if (!showTooltip) return badgeElement;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold">{isRTL ? badge.name_ar : badge.name}</p>
            {badge.rarity && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-medium',
                badge.rarity === 'legendary' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                badge.rarity === 'epic' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                badge.rarity === 'rare' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                badge.rarity === 'common' && 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              )}>
                {badge.rarity}
              </span>
            )}
          </div>
          {(badge.description || badge.description_ar) && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? badge.description_ar : badge.description}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Locked badge placeholder
interface LockedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  hint?: string;
  hintAr?: string;
}

export const LockedBadge: React.FC<LockedBadgeProps> = ({ 
  size = 'md',
  hint,
  hintAr
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <motion.div 
            className={cn(
              'rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center',
              'bg-muted/50 text-muted-foreground/50 cursor-help',
              sizeClasses[size]
            )}
            whileHover={{ scale: 1.05 }}
          >
            <Lock className={cn(iconSizes[size], 'opacity-50')} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="font-medium text-sm mb-1">
            {isRTL ? 'شارة مغلقة' : 'Locked Badge'}
          </p>
          {(hint || hintAr) && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? hintAr : hint}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Shield Badge specifically for beta users - Dark silver premium design
export const ShieldBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleClick = () => {
    navigate('/achievements');
  };
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <motion.div 
            onClick={handleClick}
            className={cn(
              'rounded-full flex items-center justify-center relative overflow-hidden cursor-pointer',
              'bg-gradient-to-br from-zinc-400 via-slate-500 to-zinc-600',
              'shadow-lg shadow-zinc-500/40 border-2 border-zinc-400/50',
              sizeClasses[size]
            )}
            whileHover={{ scale: 1.15, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {/* Metallic overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-700/20 to-white/20 backdrop-blur-[1px]" />
            
            {/* Animated glow ring */}
            <motion.div
              className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-zinc-300 via-slate-200 to-zinc-300"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ opacity: 0.5 }}
            />
            
            {/* Inner circle - dark silver */}
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-zinc-400 via-slate-500 to-zinc-600" />
            
            {/* Shiny sweep effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
              initial={{ x: '-150%' }}
              animate={{ x: '150%' }}
              transition={{ repeat: Infinity, duration: 3, repeatDelay: 2, ease: 'easeInOut' }}
            />
            
            <Shield className={cn(
              iconSizes[size],
              'text-white drop-shadow-md relative z-10'
            )} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 bg-gradient-to-br from-zinc-100 to-slate-100 dark:from-zinc-900/90 dark:to-slate-900/90 border-zinc-300 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-zinc-700 dark:text-zinc-200">
              {isRTL ? 'الدرع' : 'The Shield'}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 uppercase tracking-wide font-bold">
              Beta
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {isRTL ? 'من أوائل 1000 مستخدم' : 'One of our first 1000 beta users'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Badges Grid with empty state
interface BadgesGridProps {
  badges: any[];
  allBadges?: any[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export const BadgesGrid: React.FC<BadgesGridProps> = ({ 
  badges, 
  allBadges = [],
  size = 'md',
  maxDisplay = 8
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  
  const earnedIds = new Set(badges.map(b => b.badges?.id || b.badge_id));
  const unearned = allBadges.filter(b => !earnedIds.has(b.id)).slice(0, maxDisplay - badges.length);
  
  if (badges.length === 0 && allBadges.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{isRTL ? 'لا توجد شارات بعد' : 'No badges yet'}</p>
        <p className="text-xs mt-1 opacity-70">
          {isRTL ? 'أكمل التحديات لكسب الشارات' : 'Complete challenges to earn badges'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-3">
      {badges.slice(0, maxDisplay).map((ub: any, index: number) => (
        <motion.div
          key={ub.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <BadgeDisplay badge={ub.badges} size={size} />
        </motion.div>
      ))}
      {unearned.map((badge: any, index: number) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (badges.length + index) * 0.05 }}
        >
          <LockedBadge 
            size={size} 
            hint={badge.description}
            hintAr={badge.description_ar}
          />
        </motion.div>
      ))}
    </div>
  );
};