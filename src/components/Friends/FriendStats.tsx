import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Heart, MessageCircle, Trophy, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguageContext } from "@/contexts/LanguageContext";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
}

interface TopFriend {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  events_count: number;
  last_event: string | null;
}

export function FriendStats() {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [topFriends, setTopFriends] = useState<TopFriend[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get friends count
      const { count: friendsTotal } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      setFriendsCount(friendsTotal || 0);

      // Get events attended with friends
      const { count: eventsTotal } = await supabase
        .from('bookings')
        .select('event_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      setEventsCount(eventsTotal || 0);

      // Get messages sent count
      const { count: messagesTotal } = await supabase
        .from('friend_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id);

      setMessagesCount(messagesTotal || 0);

      // Get top friends by shared events
      const { data: friendsList } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          profiles!friendships_friend_id_fkey(user_id, full_name, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .limit(10);

      if (friendsList) {
        const friendsData: TopFriend[] = [];

        for (const friendship of friendsList) {
          const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
          const profile = friendship.profiles;

          // Get events count for this friend
          const { count: sharedEvents } = await supabase
            .from('bookings')
            .select('event_id', { count: 'exact', head: true })
            .eq('user_id', friendId)
            .eq('status', 'confirmed');

          // Get last event together
          const { data: lastEventData } = await supabase
            .from('bookings')
            .select('events(title, title_ar, start_date)')
            .eq('user_id', friendId)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (profile) {
            friendsData.push({
              user_id: friendId,
              full_name: profile.full_name || language === 'ar' ? 'مستخدم' : 'User',
              avatar_url: profile.avatar_url,
              events_count: sharedEvents || 0,
              last_event: lastEventData?.events 
                ? `${language === 'ar' ? lastEventData.events.title_ar : lastEventData.events.title}`
                : null
            });
          }
        }

        // Sort by events count and take top 3
        const sorted = friendsData.sort((a, b) => b.events_count - a.events_count).slice(0, 3);
        setTopFriends(sorted);
      }
    } catch (error) {
      console.error('Error loading friend stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats: StatCard[] = [
    {
      title: language === 'ar' ? 'إجمالي الأصدقاء' : 'Total Friends',
      value: friendsCount.toString(),
      change: '',
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: language === 'ar' ? 'الفعاليات المحجوزة' : 'Events Booked',
      value: eventsCount.toString(),
      change: '',
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: language === 'ar' ? 'الرسائل المرسلة' : 'Messages Sent',
      value: messagesCount.toString(),
      change: '',
      icon: MessageCircle,
      color: "text-purple-500",
    },
    {
      title: language === 'ar' ? 'معدل التفاعل' : 'Engagement',
      value: friendsCount > 0 ? Math.round((messagesCount / friendsCount) * 10) / 10 + '' : '0',
      change: language === 'ar' ? 'رسالة لكل صديق' : 'msgs per friend',
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {language === 'ar' ? 'إحصائيات الأصدقاء' : 'Friend Statistics'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'ar' 
            ? 'تتبع صداقاتك ومستوى تفاعلك'
            : 'Track your friendships and engagement'}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                {stat.change && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Friends */}
      {topFriends.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {language === 'ar' ? 'أكثر الأصدقاء نشاطاً' : 'Most Active Friends'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topFriends.map((friend, index) => (
              <div
                key={friend.user_id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    {friend.avatar_url ? (
                      <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      {friend.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{friend.full_name}</h4>
                  {friend.last_event && (
                    <p className="text-sm text-muted-foreground">
                      {friend.last_event}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {friend.events_count} {language === 'ar' ? 'فعالية' : 'events'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {friendsCount === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا يوجد أصدقاء بعد' : 'No Friends Yet'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'ابدأ بإضافة أصدقاء لرؤية الإحصائيات'
                : 'Start adding friends to see statistics'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
