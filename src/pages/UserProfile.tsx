import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useUserActivities } from '@/hooks/useUserActivities';
import { useFollowers, useFollowing } from '@/hooks/useFollow';
import { useUserBadges } from '@/hooks/useGamification';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import FollowButton from '@/components/Follow/FollowButton';
import ActivityCard from '@/components/Feed/ActivityCard';
import { BadgeDisplay, ShieldBadge } from '@/components/Gamification/BadgeDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Calendar, Users, Settings, Award } from 'lucide-react';

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { language } = useLanguageContext();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: userGroups } = useQuery({
    queryKey: ['user-groups', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, event_groups(id, group_name, image_url, current_members)')
        .eq('user_id', userId!)
        .limit(6);
      return data?.map(g => g.event_groups).filter(Boolean) || [];
    },
    enabled: !!userId,
  });

  const { data: activities } = useUserActivities(userId, 10);
  const { data: followers } = useFollowers(userId);
  const { data: following } = useFollowing(userId);
  const { data: userBadges } = useUserBadges(userId);

  const isOwnProfile = user?.id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'المستخدم غير موجود' : 'User not found'}</h1>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-start">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {profile.full_name || profile.display_id}
                  {profile.is_shield_member && <ShieldBadge size="sm" />}
                </h1>
                <p className="text-muted-foreground">@{profile.display_id}</p>
                {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
                {profile.city && (
                  <div className="flex items-center gap-1 mt-2 justify-center sm:justify-start text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.city}</span>
                  </div>
                )}
                {/* Stats */}
                <div className="flex gap-6 mt-4 justify-center sm:justify-start">
                  <Link to={`/user/${userId}/followers`} className="text-center hover:underline">
                    <span className="font-bold">{profile.followers_count || 0}</span>
                    <span className="text-muted-foreground text-sm ml-1">{language === 'ar' ? 'متابع' : 'Followers'}</span>
                  </Link>
                  <Link to={`/user/${userId}/following`} className="text-center hover:underline">
                    <span className="font-bold">{profile.following_count || 0}</span>
                    <span className="text-muted-foreground text-sm ml-1">{language === 'ar' ? 'يتابع' : 'Following'}</span>
                  </Link>
                </div>
              </div>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Button variant="outline" asChild>
                    <Link to="/settings"><Settings className="h-4 w-4 mr-2" />{language === 'ar' ? 'الإعدادات' : 'Settings'}</Link>
                  </Button>
                ) : (
                  <FollowButton userId={userId!} />
                )}
              </div>
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">{language === 'ar' ? 'الاهتمامات' : 'Interests'}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string, i: number) => (
                    <Badge key={i} variant="secondary">{interest}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements & Badges Section */}
        {userBadges && userBadges.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{language === 'ar' ? 'الإنجازات والشارات' : 'Achievements & Badges'}</h3>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {userBadges.length} {language === 'ar' ? 'شارة' : 'badges'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                {userBadges.map((ub: any) => (
                  <BadgeDisplay key={ub.id} badge={ub.badges} size="md" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="activity">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1">{language === 'ar' ? 'النشاطات' : 'Activity'}</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1">{language === 'ar' ? 'القروبات' : 'Groups'}</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4 space-y-3">
            {activities && activities.length > 0 ? (
              activities.map(a => <ActivityCard key={a.id} activity={{...a, user: {full_name: profile.full_name, avatar_url: profile.avatar_url, display_id: profile.display_id}}} />)
            ) : (
              <p className="text-center text-muted-foreground py-8">{language === 'ar' ? 'لا توجد نشاطات' : 'No activities yet'}</p>
            )}
          </TabsContent>
          <TabsContent value="groups" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {userGroups?.map((group: any) => (
                <Link key={group.id} to={`/groups/${group.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {group.image_url ? <img src={group.image_url} className="h-full w-full object-cover" /> : <Users className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium">{group.group_name}</p>
                        <p className="text-xs text-muted-foreground">{group.current_members} {language === 'ar' ? 'عضو' : 'members'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
