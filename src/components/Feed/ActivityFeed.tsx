import React from 'react';
import { useFollowingActivities } from '@/hooks/useUserActivities';
import { useLanguageContext } from '@/contexts/LanguageContext';
import ActivityCard from './ActivityCard';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  limit?: number;
  className?: string;
  showHeader?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 10,
  className,
  showHeader = true,
}) => {
  const { language } = useLanguageContext();
  const { data: activities, isLoading } = useFollowingActivities(limit);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold mb-2">
          {language === 'ar' ? 'لا توجد نشاطات بعد' : 'No activity yet'}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {language === 'ar' 
            ? 'تابع مستخدمين آخرين لرؤية نشاطاتهم هنا'
            : 'Follow other users to see their activities here'}
        </p>
        <Button asChild>
          <Link to="/discover-people">
            {language === 'ar' ? 'اكتشف أشخاص' : 'Discover People'}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {language === 'ar' ? 'نشاطات المتابَعين' : 'Following Activity'}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/discover-people">
              {language === 'ar' ? 'اكتشف المزيد' : 'Discover More'}
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
