import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import UserSearch from '@/components/Follow/UserSearch';
import UserCard from '@/components/Follow/UserCard';
import { useSuggestedUsers } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Sparkles, TrendingUp, UserPlus, Search, Globe, Heart } from 'lucide-react';

const DiscoverPeople = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { data: suggestedUsers, isLoading } = useSuggestedUsers(20);
  const [activeTab, setActiveTab] = useState('suggested');

  const FeatureCard = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-border/50`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );

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
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isRTL ? 'اكتشف مجتمعك' : 'Discover Your Community'}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {isRTL ? 'اكتشف أشخاص جدد' : 'Discover New People'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {isRTL 
              ? 'تواصل مع المغامرين وشارك تجاربك وابنِ صداقات جديدة'
              : 'Connect with adventurers, share experiences, and build lasting friendships'}
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon={Globe}
            title={isRTL ? 'اكتشف عالمياً' : 'Global Discovery'}
            description={isRTL ? 'تواصل مع مغامرين من كل مكان' : 'Connect with adventurers worldwide'}
            color="from-blue-500/10 to-cyan-500/5"
          />
          <FeatureCard
            icon={Heart}
            title={isRTL ? 'اهتمامات مشتركة' : 'Shared Interests'}
            description={isRTL ? 'جد أشخاص يشاركونك شغفك' : 'Find people who share your passion'}
            color="from-pink-500/10 to-rose-500/5"
          />
          <FeatureCard
            icon={TrendingUp}
            title={isRTL ? 'مستخدمون نشطون' : 'Active Users'}
            description={isRTL ? 'تفاعل مع أكثر الأعضاء نشاطاً' : 'Engage with the most active members'}
            color="from-green-500/10 to-emerald-500/5"
          />
        </div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 overflow-hidden border-2 border-primary/10">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                {isRTL ? 'ابحث عن مستخدمين' : 'Search Users'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <UserSearch />
            </CardContent>
          </Card>
        </motion.div>

        {/* Suggested Users Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  {isRTL ? 'مقترحات لك' : 'Suggested for You'}
                </CardTitle>
                {suggestedUsers && suggestedUsers.length > 0 && (
                  <Badge variant="secondary" className="font-normal">
                    {suggestedUsers.length} {isRTL ? 'شخص' : 'people'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="suggested" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {isRTL ? 'مقترحات' : 'Suggested'}
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {isRTL ? 'الأكثر متابعة' : 'Most Followed'}
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <TabsContent value="suggested" className="mt-0">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">
                          {isRTL ? 'جاري البحث عن أشخاص...' : 'Finding people for you...'}
                        </p>
                      </div>
                    ) : suggestedUsers && suggestedUsers.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        {suggestedUsers.map((user, index) => (
                          <motion.div
                            key={user.user_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <UserCard
                              userId={user.user_id}
                              fullName={user.full_name}
                              displayId={user.display_id}
                              avatarUrl={user.avatar_url}
                              bio={user.bio}
                              followersCount={user.followers_count}
                              isPrivate={user.is_private}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Users className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                          {isRTL ? 'لا توجد اقتراحات' : 'No Suggestions Available'}
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          {isRTL 
                            ? 'جرب البحث للعثور على أشخاص للمتابعة'
                            : 'Try searching to find people to follow'}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="popular" className="mt-0">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">
                          {isRTL ? 'جاري التحميل...' : 'Loading...'}
                        </p>
                      </div>
                    ) : suggestedUsers && suggestedUsers.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        {[...suggestedUsers]
                          .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
                          .map((user, index) => (
                            <motion.div
                              key={user.user_id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <UserCard
                                userId={user.user_id}
                                fullName={user.full_name}
                                displayId={user.display_id}
                                avatarUrl={user.avatar_url}
                                bio={user.bio}
                                followersCount={user.followers_count}
                                isPrivate={user.is_private}
                              />
                            </motion.div>
                          ))}
                      </motion.div>
                    ) : (
                      <div className="text-center py-16">
                        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {isRTL ? 'لا توجد نتائج' : 'No results found'}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoverPeople;
