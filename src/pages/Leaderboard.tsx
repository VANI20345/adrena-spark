import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

export default function Leaderboard() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const isRTL = language === 'ar';

  const { data: leaderboardData = [] } = useSupabaseQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*, profiles!leaderboard_entries_user_id_fkey(full_name, avatar_url)')
        .eq('period_type', period)
        .order('rank', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: userRank } = useSupabaseQuery({
    queryKey: ['user-rank', period, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('period_type', period)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  const renderLeaderboardEntry = (entry: any, index: number) => {
    const isCurrentUser = user?.id === entry.user_id;
    const isTopThree = entry.rank <= 3;

    return (
      <Card 
        key={entry.id}
        className={`${isCurrentUser ? 'border-primary shadow-lg' : ''} ${isTopThree ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <Avatar className="h-12 w-12">
              <AvatarImage src={entry.profiles?.avatar_url} />
              <AvatarFallback>
                {entry.profiles?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {entry.profiles?.full_name || (isRTL ? 'مستخدم' : 'User')}
                </h3>
                {isCurrentUser && (
                  <Badge variant="default">
                    {isRTL ? 'أنت' : 'You'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                <span>{entry.points} {isRTL ? 'نقطة' : 'points'}</span>
                <span>{entry.events_attended} {isRTL ? 'فعالية' : 'events'}</span>
                <span>{entry.groups_joined} {isRTL ? 'مجموعة' : 'groups'}</span>
              </div>
            </div>
            {isTopThree && (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{entry.points}</div>
                <div className="text-xs text-muted-foreground">
                  {isRTL ? 'نقطة' : 'points'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {isRTL ? 'لوحة المتصدرين' : 'Leaderboard'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isRTL 
              ? 'تنافس مع المغامرين واحصل على المركز الأول' 
              : 'Compete with adventurers and reach the top'}
          </p>
        </div>

        <Tabs defaultValue="weekly" className="space-y-6" onValueChange={(v) => setPeriod(v as 'weekly' | 'monthly')}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="weekly">
              {isRTL ? 'أسبوعي' : 'Weekly'}
            </TabsTrigger>
            <TabsTrigger value="monthly">
              {isRTL ? 'شهري' : 'Monthly'}
            </TabsTrigger>
          </TabsList>

          {/* Current User Rank */}
          {userRank && (
            <Card className="border-primary shadow-lg">
              <CardHeader>
                <CardTitle className="text-center">
                  {isRTL ? 'ترتيبك الحالي' : 'Your Current Rank'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    #{userRank.rank}
                  </div>
                  <div className="text-muted-foreground">
                    {userRank.points} {isRTL ? 'نقطة' : 'points'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <TabsContent value="weekly">
            <div className="space-y-4">
              {leaderboardData.length > 0 ? (
                leaderboardData.map(renderLeaderboardEntry)
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    {isRTL ? 'لا توجد بيانات حالياً' : 'No data available'}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="monthly">
            <div className="space-y-4">
              {leaderboardData.length > 0 ? (
                leaderboardData.map(renderLeaderboardEntry)
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    {isRTL ? 'لا توجد بيانات حالياً' : 'No data available'}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
