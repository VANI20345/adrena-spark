import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useBadges, useUserBadges, useCheckBadges } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Star, Target, Lock, CheckCircle, Sparkles, 
  Ticket, Compass, Mountain, GraduationCap, Award, Users, Crown, Share2, Shield,
  Heart, MessageCircle, Calendar, Gift, Zap, Flame, Medal, Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping for badges
const iconMap: Record<string, React.ComponentType<any>> = {
  Ticket, Compass, Mountain, GraduationCap, Award, Users, Crown, Share2, Shield,
  Heart, MessageCircle, Calendar, Gift, Zap, Flame, Medal, Rocket, Star, Trophy
};

const rarityColors: Record<string, string> = {
  common: 'from-slate-400 to-slate-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-orange-500'
};

const rarityBgColors: Record<string, string> = {
  common: 'bg-slate-100 dark:bg-slate-800',
  rare: 'bg-blue-100 dark:bg-blue-900/30',
  epic: 'bg-purple-100 dark:bg-purple-900/30',
  legendary: 'bg-amber-100 dark:bg-amber-900/30'
};

const rarityTextColors: Record<string, string> = {
  common: 'text-slate-600 dark:text-slate-300',
  rare: 'text-blue-600 dark:text-blue-300',
  epic: 'text-purple-600 dark:text-purple-300',
  legendary: 'text-amber-600 dark:text-amber-300'
};

const AchievementsPage = () => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: allBadges = [], isLoading: loadingBadges } = useBadges();
  const { data: userBadges = [], isLoading: loadingUserBadges } = useUserBadges(user?.id);
  const checkBadges = useCheckBadges();

  // Get user stats for progress tracking
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [bookings, trainings, groups, groupsCreated, profile] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed'),
        supabase.from('service_bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed'),
        supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('event_groups').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('profiles').select('referral_count, points_balance, is_shield_member').eq('user_id', user.id).single()
      ]);
      
      return {
        booking_count: bookings.count || 0,
        training_count: trainings.count || 0,
        group_count: groups.count || 0,
        group_created: groupsCreated.count || 0,
        referral_count: profile.data?.referral_count || 0,
        points_balance: profile.data?.points_balance || 0,
        is_shield_member: profile.data?.is_shield_member || false
      };
    },
    enabled: !!user?.id
  });

  // Check for new badges on mount
  useEffect(() => {
    if (user?.id) {
      checkBadges.mutate();
    }
  }, [user?.id]);

  const earnedBadgeIds = new Set(userBadges.map((ub: any) => ub.badge_id));
  
  const getProgress = (badge: any) => {
    if (!userStats || !badge.requirement_type || !badge.requirement_value) return 0;
    const current = userStats[badge.requirement_type as keyof typeof userStats] || 0;
    return Math.min((Number(current) / badge.requirement_value) * 100, 100);
  };

  const getCurrentValue = (badge: any) => {
    if (!userStats || !badge.requirement_type) return 0;
    return userStats[badge.requirement_type as keyof typeof userStats] || 0;
  };

  const filteredBadges = allBadges.filter((badge: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'earned') return earnedBadgeIds.has(badge.id);
    if (activeTab === 'locked') return !earnedBadgeIds.has(badge.id);
    return badge.badge_type === activeTab;
  });

  const earnedCount = userBadges.length;
  const totalPoints = userBadges.reduce((sum: number, ub: any) => sum + (ub.badges?.points_reward || 0), 0);

  const BadgeCard = ({ badge, isEarned }: { badge: any; isEarned: boolean }) => {
    const IconComponent = iconMap[badge.icon_name] || Trophy;
    const progress = getProgress(badge);
    const currentValue = getCurrentValue(badge);
    const rarity = badge.rarity || 'common';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -5 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
          isEarned 
            ? "border-primary/30 shadow-lg shadow-primary/10" 
            : "border-border/50 opacity-70 hover:opacity-100"
        )}
      >
        {/* Rarity indicator strip */}
        <div className={cn("h-1.5 bg-gradient-to-r", rarityColors[rarity])} />
        
        <Card className="border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Badge Icon */}
              <div className={cn(
                "relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center",
                isEarned 
                  ? `bg-gradient-to-br ${rarityColors[rarity]}` 
                  : "bg-muted"
              )}>
                <IconComponent className={cn(
                  "w-8 h-8",
                  isEarned ? "text-white" : "text-muted-foreground"
                )} />
                {isEarned && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                  </motion.div>
                )}
                {!isEarned && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Badge Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={cn(
                    "font-bold text-lg",
                    isEarned ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {isRTL ? badge.name_ar : badge.name}
                  </h3>
                  <Badge className={cn("text-xs", rarityBgColors[rarity], rarityTextColors[rarity])}>
                    {isRTL 
                      ? { common: 'عادي', rare: 'نادر', epic: 'أسطوري', legendary: 'خرافي' }[rarity]
                      : rarity.charAt(0).toUpperCase() + rarity.slice(1)
                    }
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {isRTL ? badge.description_ar : badge.description}
                </p>

                {/* Progress bar for locked badges */}
                {!isEarned && badge.requirement_value && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {isRTL ? 'التقدم' : 'Progress'}
                      </span>
                      <span className="font-medium">
                        {currentValue} / {badge.requirement_value}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Points reward */}
                {badge.points_reward > 0 && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      +{badge.points_reward} {isRTL ? 'نقطة' : 'points'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Trophy className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isRTL ? 'مجموعة الإنجازات' : 'Achievement Collection'}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {isRTL ? 'الإنجازات والشارات' : 'Achievements & Badges'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {isRTL 
              ? 'اجمع الشارات وأكمل التحديات لتربح نقاطًا إضافية'
              : 'Collect badges and complete challenges to earn bonus points'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'الشارات المكتسبة' : 'Badges Earned'}
                  </p>
                  <p className="text-2xl font-bold">{earnedCount} / {allBadges.length}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'نقاط من الشارات' : 'Points from Badges'}
                  </p>
                  <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'نسبة الإكمال' : 'Completion Rate'}
                  </p>
                  <p className="text-2xl font-bold">
                    {allBadges.length > 0 ? Math.round((earnedCount / allBadges.length) * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs and Badges Grid */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-grid">
                <TabsTrigger value="all" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">{isRTL ? 'الكل' : 'All'}</span>
                </TabsTrigger>
                <TabsTrigger value="earned" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{isRTL ? 'مكتسب' : 'Earned'}</span>
                </TabsTrigger>
                <TabsTrigger value="locked" className="gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">{isRTL ? 'مقفل' : 'Locked'}</span>
                </TabsTrigger>
                <TabsTrigger value="special" className="gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">{isRTL ? 'خاص' : 'Special'}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loadingBadges || loadingUserBadges ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredBadges.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">
                  {isRTL ? 'لا توجد شارات' : 'No Badges Found'}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'earned' 
                    ? (isRTL ? 'لم تكتسب أي شارات بعد' : "You haven't earned any badges yet")
                    : (isRTL ? 'لا توجد شارات في هذه الفئة' : 'No badges in this category')
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredBadges.map((badge: any, index: number) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BadgeCard badge={badge} isEarned={earnedBadgeIds.has(badge.id)} />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-2">
                {isRTL ? 'ابدأ رحلتك الآن!' : 'Start Your Journey!'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL 
                  ? 'احجز فعاليات، انضم لمجموعات، وادعُ أصدقاءك لتربح شارات'
                  : 'Book events, join groups, and invite friends to earn badges'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild>
                  <Link to="/events">{isRTL ? 'استكشف الفعاليات' : 'Explore Events'}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/groups">{isRTL ? 'اكتشف المجموعات' : 'Discover Groups'}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/referral">{isRTL ? 'دعوة أصدقاء' : 'Invite Friends'}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default AchievementsPage;
