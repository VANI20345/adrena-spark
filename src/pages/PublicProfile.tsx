import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FriendButton } from '@/components/Friends/FriendButton';
import { FollowerStats } from '@/components/Profile/FollowerStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProfileData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  created_at: string;
  profile_visibility: string;
}

const PublicProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchFriendsCount();
    if (user) {
      fetchMutualFriends();
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city, bio, created_at, profile_visibility')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Check if user can view this profile
      if (data.profile_visibility === 'private' && user?.id !== userId) {
        toast({
          title: 'ملف شخصي خاص',
          description: 'هذا الملف الشخصي خاص ولا يمكن عرضه',
          variant: 'destructive'
        });
        setProfile(null);
        return;
      }

      if (data.profile_visibility === 'friends_only' && user?.id !== userId) {
        // Check if they're friends
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .eq('user_id', user?.id || '')
          .eq('friend_id', userId)
          .eq('status', 'accepted')
          .single();

        if (!friendship) {
          toast({
            title: 'ملف شخصي للأصدقاء فقط',
            description: 'هذا الملف الشخصي متاح للأصدقاء فقط',
            variant: 'destructive'
          });
          setProfile(null);
          return;
        }
      }

      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الملف الشخصي',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsCount = async () => {
    if (!userId) return;

    try {
      const { count, error } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriendsCount(count || 0);
    } catch (error) {
      console.error('Error fetching friends count:', error);
    }
  };

  const fetchMutualFriends = async () => {
    if (!userId || !user) return;

    try {
      // Get current user's friends
      const { data: myFriends, error: myError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (myError) throw myError;

      if (!myFriends || myFriends.length === 0) {
        setMutualFriendsCount(0);
        return;
      }

      const myFriendIds = myFriends.map(f => f.friend_id);

      // Get profile user's friends
      const { data: theirFriends, error: theirError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .in('friend_id', myFriendIds);

      if (theirError) throw theirError;

      setMutualFriendsCount(theirFriends?.length || 0);
    } catch (error) {
      console.error('Error fetching mutual friends:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-6">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <div className="text-center space-y-2 w-full">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                    <Skeleton className="h-20 w-full mt-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">الملف الشخصي غير متاح</h3>
                <p className="text-muted-foreground">
                  لا يمكن عرض هذا الملف الشخصي
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">
                    {profile.full_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center space-y-2 w-full">
                  <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                  
                  <div className="flex items-center justify-center gap-4 text-muted-foreground">
                    {profile.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{profile.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        انضم {formatDistanceToNow(new Date(profile.created_at), { 
                          addSuffix: true, 
                          locale: ar 
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{friendsCount}</div>
                      <div className="text-sm text-muted-foreground">صديق</div>
                    </div>
                    {mutualFriendsCount > 0 && user && (
                      <div className="text-center">
                        <div className="text-2xl font-bold">{mutualFriendsCount}</div>
                        <div className="text-sm text-muted-foreground">أصدقاء مشتركين</div>
                      </div>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground mt-4 max-w-2xl">
                      {profile.bio}
                    </p>
                  )}

                  {user && user.id !== userId && (
                    <div className="mt-6">
                      <FriendButton userId={userId} size="lg" />
                    </div>
                  )}

                  {/* Follower Stats */}
                  {userId && (
                    <div className="mt-6 w-full max-w-2xl">
                      <FollowerStats 
                        userId={userId} 
                        isOwnProfile={user?.id === userId} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfile;