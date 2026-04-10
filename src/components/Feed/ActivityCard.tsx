import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  ShoppingBag,
  CalendarCheck,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    activity_type: string;
    entity_type: string;
    entity_id: string;
    entity_data: any;
    created_at: string;
    user?: {
      full_name: string | null;
      avatar_url: string | null;
      display_id: string;
    };
  };
  className?: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, className }) => {
  const { language } = useLanguageContext();

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'joined_event':
        return CalendarCheck;
      case 'created_event':
        return Calendar;
      case 'joined_group':
        return Users;
      case 'created_group':
        return UserPlus;
      case 'booked_service':
        return ShoppingBag;
      case 'post_created':
        return MessageSquare;
      default:
        return Calendar;
    }
  };

  const getActivityText = () => {
    const entityName = activity.entity_data?.title || 
                       activity.entity_data?.title_ar || 
                       activity.entity_data?.group_name ||
                       activity.entity_data?.name ||
                       activity.entity_data?.name_ar ||
                       '';
    
    switch (activity.activity_type) {
      case 'joined_event':
        return language === 'ar' 
          ? `سجل في فعالية` 
          : `Joined an event`;
      case 'created_event':
        return language === 'ar' 
          ? `أنشأ فعالية جديدة` 
          : `Created a new event`;
      case 'joined_group':
        return language === 'ar' 
          ? `انضم إلى قروب` 
          : `Joined a group`;
      case 'created_group':
        return language === 'ar' 
          ? `أنشأ قروب جديد` 
          : `Created a new group`;
      case 'booked_service':
        return language === 'ar' 
          ? `حجز خدمة` 
          : `Booked a service`;
      case 'post_created':
        return language === 'ar' 
          ? `نشر منشور جديد` 
          : `Created a new post`;
      default:
        return '';
    }
  };

  const getEntityLink = () => {
    switch (activity.entity_type) {
      case 'event':
        return `/event/${activity.entity_id}`;
      case 'group':
        return `/groups/${activity.entity_id}`;
      case 'service':
        return `/service/${activity.entity_id}`;
      case 'post':
        return `/groups/${activity.entity_data?.group_id || activity.entity_id}`;
      default:
        return '#';
    }
  };

  const getEntityName = () => {
    if (language === 'ar') {
      return activity.entity_data?.title_ar || 
             activity.entity_data?.name_ar || 
             activity.entity_data?.group_name ||
             activity.entity_data?.title ||
             activity.entity_data?.name ||
             activity.entity_data?.content_preview ||
             '';
    }
    return activity.entity_data?.title || 
           activity.entity_data?.name || 
           activity.entity_data?.group_name ||
           activity.entity_data?.content_preview ||
           '';
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const Icon = getActivityIcon();
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
    locale: language === 'ar' ? ar : enUS,
  });

  return (
    <Card className={cn('overflow-hidden hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* User Avatar */}
          <Link to={`/user/${activity.user_id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.user?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(activity.user?.full_name || null)}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/user/${activity.user_id}`} className="font-semibold hover:underline">
                {activity.user?.full_name || activity.user?.display_id || 'User'}
              </Link>
              <span className="text-muted-foreground text-sm">{getActivityText()}</span>
            </div>

            {/* Entity Preview */}
            <Link 
              to={getEntityLink()}
              className="mt-2 flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {activity.entity_data?.image_url ? (
                  <img 
                    src={activity.entity_data.image_url} 
                    alt="" 
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{getEntityName()}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {activity.entity_type}
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityCard;
