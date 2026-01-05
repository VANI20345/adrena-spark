import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useUserActivities } from '@/hooks/useUserActivities';
import { useFollowers, useFollowing } from '@/hooks/useFollow';
import { useUserBadges } from '@/hooks/useGamification';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import FollowButton from '@/components/Follow/FollowButton';
import ActivityCard from '@/components/Feed/ActivityCard';
import { ShieldBadge } from '@/components/Gamification/BadgeDisplay';
import { AchievementsSection } from '@/components/Gamification/AchievementsSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Users, Settings, Calendar, Crown, Shield } from 'lucide-react';

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
        .select(`
          group_id, 
          joined_at,
          role,
          event_groups!inner(id, group_name, image_url, current_members, description, created_at)
        `)
        .eq('user_id', userId!)
        .limit(6);
      return data?.map(g => ({ 
        ...g.event_groups, 
        joined_at: g.joined_at,
        role: g.role 
      })).filter(Boolean) || [];
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
                <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                  {profile.full_name || profile.display_id}
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

        {/* Achievements & Badges Section - Always visible */}
        <AchievementsSection
          userBadges={userBadges || []}
          isShieldMember={profile.is_shield_member}
          totalPoints={profile.points_balance || 0}
          className="mb-6"
        />

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
                  <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden h-full">
                    <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
                      {group.image_url ? (
                        <img src={group.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      {group.role === 'owner' && (
                        <Badge className="absolute top-2 right-2 rtl:right-auto rtl:left-2 gap-1">
                          <Crown className="h-3 w-3" />
                          {language === 'ar' ? 'مالك' : 'Owner'}
                        </Badge>
                      )}
                      {group.role === 'admin' && (
                        <Badge variant="secondary" className="absolute top-2 right-2 rtl:right-auto rtl:left-2 gap-1">
                          <Shield className="h-3 w-3" />
                          {language === 'ar' ? 'مشرف' : 'Admin'}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{group.group_name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.current_members} {language === 'ar' ? 'عضو' : 'members'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {language === 'ar' ? 'انضم ' : 'Joined '}
                          {format(new Date(group.joined_at), 'MMM yyyy', { locale: language === 'ar' ? ar : undefined })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {(!userGroups || userGroups.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لم ينضم لأي مجموعة بعد' : 'Not a member of any groups yet'}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
