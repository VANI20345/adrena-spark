import React from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import UserSearch from '@/components/Follow/UserSearch';
import UserCard from '@/components/Follow/UserCard';
import { useSuggestedUsers } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users } from 'lucide-react';

const DiscoverPeople = () => {
  const { language } = useLanguageContext();
  const { data: suggestedUsers, isLoading } = useSuggestedUsers(12);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">{language === 'ar' ? 'اكتشف أشخاص' : 'Discover People'}</h1>
        
        <Card className="mb-8">
          <CardHeader><CardTitle>{language === 'ar' ? 'البحث عن مستخدمين' : 'Search Users'}</CardTitle></CardHeader>
          <CardContent><UserSearch /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {language === 'ar' ? 'مقترحات للمتابعة' : 'Suggested for You'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : suggestedUsers && suggestedUsers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {suggestedUsers.map((user) => (
                  <UserCard key={user.user_id} userId={user.user_id} fullName={user.full_name} displayId={user.display_id} avatarUrl={user.avatar_url} bio={user.bio} followersCount={user.followers_count} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{language === 'ar' ? 'لا توجد اقتراحات' : 'No suggestions available'}</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DiscoverPeople;
