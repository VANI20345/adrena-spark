import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import UserCard from '@/components/Follow/UserCard';
import { SuggestedGroupCard } from '@/components/Follow/SuggestedGroupCard';
import { useSuggestedUsers, useSearchUsers } from '@/hooks/useFollow';
import { useSuggestedGroups } from '@/hooks/useSuggestedGroups';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Sparkles, TrendingUp, UserPlus, Search, X, Users2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const DiscoverPeople = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('people');
  
  // Fetch 6 suggested users (mixed mutual groups and mutual connections)
  const { data: suggestedUsers, isLoading: suggestionsLoading } = useSuggestedUsers(6);
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(searchTerm);
  const { data: suggestedGroups, isLoading: groupsLoading } = useSuggestedGroups(6);
  
  const isSearching = searchTerm.length >= 2;
  const displayUsers = isSearching ? searchResults : suggestedUsers;
  const isLoading = isSearching ? searchLoading : suggestionsLoading;

  const clearSearch = () => setSearchTerm('');

  // Get suggestion reason label - professional style like LinkedIn/Facebook
  const getSuggestionLabel = (reason: string | null | undefined, sharedGroups?: { group_name: string }[]) => {
    if (!reason) return null;
    switch (reason) {
      case 'mutual_group':
        const groupCount = sharedGroups?.length || 0;
        const groupName = sharedGroups?.[0]?.group_name;
        return {
          icon: Users2,
          text: isRTL 
            ? (groupCount > 1 ? `${groupCount} مجموعات مشتركة` : `عضو في ${groupName || 'مجموعتك'}`)
            : (groupCount > 1 ? `${groupCount} mutual groups` : `Member of ${groupName || 'your group'}`),
          color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        };
      case 'mutual_connection':
        return {
          icon: UserCheck,
          text: isRTL ? 'يتابعه أصدقاؤك' : 'Followed by friends',
          color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
        };
      case 'popular':
        return {
          icon: TrendingUp,
          text: isRTL ? 'مؤثر في المجتمع' : 'Community influencer',
          color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        };
      default:
        return null;
    }
  };

  const FeatureCard = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-border/50`}
    >
      <div className={cn("flex items-start gap-3", isRTL && "flex-row-reverse text-right")}>
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

  // Render user card with suggestion reason and shared groups - LinkedIn style
  const renderUserCard = (user: any, index: number) => {
    const suggestionInfo = getSuggestionLabel(user.suggestion_reason, user.shared_groups);
    
    return (
      <motion.div
        key={user.user_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative"
      >
        {/* Suggestion badge - positioned like LinkedIn's "Based on your profile" */}
        {suggestionInfo && (
          <div className={cn(
            "absolute -top-2.5 z-10",
            isRTL ? "right-3" : "left-3"
          )}>
            <Badge 
              variant="outline"
              className={cn(
                "gap-1.5 text-xs px-2.5 py-1 font-medium shadow-sm border",
                suggestionInfo.color,
                isRTL && "flex-row-reverse"
              )}
            >
              <suggestionInfo.icon className="h-3 w-3" />
              {suggestionInfo.text}
            </Badge>
          </div>
        )}
        <UserCard
          userId={user.user_id}
          fullName={user.full_name}
          displayId={user.display_id}
          avatarUrl={user.avatar_url}
          bio={user.bio}
          followersCount={user.followers_count}
          followingCount={user.following_count}
          isPrivate={user.is_private}
          sharedGroups={user.shared_groups || []}
          suggestionReason={user.suggestion_reason}
        />
      </motion.div>
    );
  };

  // Render suggested group card
  const renderGroupCard = (group: any, index: number) => (
    <motion.div
      key={group.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <SuggestedGroupCard
        groupId={group.id}
        groupName={group.group_name}
        imageUrl={group.image_url}
        organizerName={group.organizer_name}
        organizerAvatar={group.organizer_avatar}
        memberCount={group.current_members}
        eventCount={group.event_count}
        interests={group.interests}
        equipment={group.equipment || []}
        cityName={group.city_name}
        cityNameAr={group.city_name_ar}
      />
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
          className={cn("text-center mb-10", isRTL && "text-center")}
        >
          <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4", isRTL && "flex-row-reverse")}>
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
            icon={Users2}
            title={isRTL ? 'من مجموعاتك' : 'From Your Groups'}
            description={isRTL ? 'أشخاص من المجموعات التي انضممت إليها' : 'People from groups you joined'}
            color="from-blue-500/10 to-cyan-500/5"
          />
          <FeatureCard
            icon={UserCheck}
            title={isRTL ? 'متابعون مشتركون' : 'Mutual Connections'}
            description={isRTL ? 'أشخاص يعرفهم متابعوك' : 'People your followers know'}
            color="from-green-500/10 to-emerald-500/5"
          />
          <FeatureCard
            icon={TrendingUp}
            title={isRTL ? 'مستخدمون نشطون' : 'Active Users'}
            description={isRTL ? 'تفاعل مع أكثر الأعضاء نشاطاً' : 'Engage with the most active members'}
            color="from-orange-500/10 to-amber-500/5"
          />
        </div>

        {/* Combined Search & Suggestions Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  {isSearching ? (
                    <>
                      <Search className="h-5 w-5 text-primary" />
                      {isRTL ? 'نتائج البحث' : 'Search Results'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 text-primary" />
                      {isRTL ? 'مقترحات لك' : 'Suggested for You'}
                    </>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Search Input */}
              <div className="relative mb-6">
                <Search className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors',
                  isRTL ? 'right-3' : 'left-3',
                  searchTerm && 'text-primary'
                )} />
                <Input
                  type="text"
                  placeholder={isRTL ? 'ابحث عن مستخدمين بالاسم أو المعرف...' : 'Search users by name or username...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'h-12 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors text-base',
                    isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'
                  )}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 h-8 w-8',
                      isRTL ? 'left-2' : 'right-2'
                    )}
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Tabs - only show when not searching */}
              {!isSearching && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className={cn("grid w-full grid-cols-2 mb-6", isRTL && "flex-row-reverse")}>
                    <TabsTrigger value="people" className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <UserCheck className="h-4 w-4" />
                      {isRTL ? 'أشخاص قد تعرفهم' : 'People you may know'}
                    </TabsTrigger>
                    <TabsTrigger value="groups" className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <Users className="h-4 w-4" />
                      {isRTL ? 'مجموعات قد تعجبك' : 'Groups you might like'}
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    {/* People Tab */}
                    <TabsContent value="people" className="mt-0">
                      {suggestionsLoading ? (
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
                          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          {suggestedUsers.map((user, index) => renderUserCard(user, index))}
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

                    {/* Groups Tab */}
                    <TabsContent value="groups" className="mt-0">
                      {groupsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                          <p className="text-muted-foreground">
                            {isRTL ? 'جاري البحث عن مجموعات...' : 'Finding groups for you...'}
                          </p>
                        </div>
                      ) : suggestedGroups && suggestedGroups.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          {suggestedGroups.map((group, index) => renderGroupCard(group, index))}
                        </motion.div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Users className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            {isRTL ? 'لا توجد مجموعات مقترحة' : 'No Suggested Groups'}
                          </h3>
                          <p className="text-muted-foreground max-w-sm mx-auto">
                            {isRTL 
                              ? 'أكمل ملفك الشخصي لتحصل على اقتراحات أفضل'
                              : 'Complete your profile to get better suggestions'}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
              )}

              {/* Search Results */}
              {isSearching && (
                <>
                  {searchLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">
                        {isRTL ? 'جاري البحث...' : 'Searching...'}
                      </p>
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {searchResults.map((user, index) => (
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
                  ) : searchTerm.length >= 2 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">
                        {isRTL ? 'لم يتم العثور على مستخدمين' : 'No users found'}
                      </h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        {isRTL 
                          ? 'جرب البحث بكلمات مختلفة'
                          : 'Try searching with different keywords'}
                      </p>
                    </div>
                  ) : (
                    <p className={cn("text-center text-muted-foreground py-4", isRTL && "text-center")}>
                      {isRTL ? 'أدخل حرفين على الأقل للبحث' : 'Enter at least 2 characters to search'}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoverPeople;
