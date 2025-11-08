import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Share2, Star, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  event_id: string | null;
  activity_data: any;
  created_at: string;
  user_profile: {
    full_name: string;
    avatar_url: string | null;
  };
  event?: {
    title_ar: string;
    image_url: string | null;
  };
}

export const FriendActivityFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchActivities();
      setupRealtimeSubscription();
    }
  }, [user?.id]);

  const fetchActivities = async () => {
    if (!user?.id) return;

    try {
      // Get friend IDs
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch activities with proper join
      const { data, error } = await supabase
        .from('friend_activities')
        .select(`
          *,
          profiles(full_name, avatar_url),
          events(title_ar, image_url)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform data to match expected structure
      const transformedActivities = (data || []).map(activity => ({
        ...activity,
        user_profile: activity.profiles
      }));

      setActivities(transformedActivities as any);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friend-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_activities'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'joined_event': return <Calendar className="h-4 w-4 text-green-500" />;
      case 'created_event': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'shared_event': return <Share2 className="h-4 w-4 text-purple-500" />;
      case 'reviewed_event': return <Star className="h-4 w-4 text-yellow-500" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.user_profile?.full_name || 'صديق';
    switch (activity.activity_type) {
      case 'joined_event': return `${userName} انضم إلى فعالية`;
      case 'created_event': return `${userName} أنشأ فعالية`;
      case 'shared_event': return `${userName} شارك فعالية`;
      case 'reviewed_event': return `${userName} قيّم فعالية`;
      default: return `${userName} نشط`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نشاط الأصدقاء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>نشاط الأصدقاء</CardTitle>
        <CardDescription>شاهد آخر نشاطات أصدقائك</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="لا توجد أنشطة"
            description="لا يوجد نشاط حديث من أصدقائك"
          />
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => activity.event_id && navigate(`/event/${activity.event_id}`)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.user_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {activity.user_profile?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.activity_type)}
                    <p className="text-sm font-medium">
                      {getActivityText(activity)}
                    </p>
                  </div>
                  {activity.event && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {activity.event.title_ar}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), 'PPp')}
                  </p>
                </div>
                {activity.event?.image_url && (
                  <img
                    src={activity.event.image_url}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};