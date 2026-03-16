import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useFriendEvents, useFriendGroups } from '@/hooks/useUserActivities';
import { Calendar, Users, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FriendSuggestionsProps {
  className?: string;
}

const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ className }) => {
  const { language } = useLanguageContext();
  const { data: friendEvents, isLoading: loadingEvents } = useFriendEvents(4);
  const { data: friendGroups, isLoading: loadingGroups } = useFriendGroups(4);

  const hasContent = (friendEvents && friendEvents.length > 0) || (friendGroups && friendGroups.length > 0);
  const isLoading = loadingEvents || loadingGroups;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Friend Events */}
      {friendEvents && friendEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'فعاليات يشارك فيها أصدقاؤك' : 'Events Your Friends Are Joining'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {friendEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/event/${event.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {event.image_url ? (
                      <img src={event.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {language === 'ar' ? event.title_ar : event.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {language === 'ar' ? event.location_ar : event.location}
                    </p>
                    {event.friend && (
                      <div className="flex items-center gap-1 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={event.friend.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {event.friend.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {event.friend.full_name} {language === 'ar' ? 'سيحضر' : 'is attending'}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {event.price ? `${event.price} SAR` : (language === 'ar' ? 'مجاني' : 'Free')}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friend Groups */}
      {friendGroups && friendGroups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'قروبات أصدقاؤك فيها' : 'Groups Your Friends Are In'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {friendGroups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {group.image_url ? (
                      <img src={group.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{group.group_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.current_members || 0} {language === 'ar' ? 'عضو' : 'members'}
                    </p>
                    {group.friend && (
                      <div className="flex items-center gap-1 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={group.friend.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {group.friend.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {group.friend.full_name} {language === 'ar' ? 'عضو' : 'is a member'}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FriendSuggestions;
