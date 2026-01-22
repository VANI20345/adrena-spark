import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Calendar, ChevronRight, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface SuggestedGroupCardProps {
  groupId: string;
  groupName: string;
  imageUrl?: string | null;
  organizerName?: string | null;
  organizerAvatar?: string | null;
  memberCount: number;
  eventCount: number;
  interests: { name: string; name_ar: string }[];
  cityName?: string | null;
  cityNameAr?: string | null;
  className?: string;
}

export const SuggestedGroupCard: React.FC<SuggestedGroupCardProps> = ({
  groupId,
  groupName,
  imageUrl,
  organizerName,
  organizerAvatar,
  memberCount,
  eventCount,
  interests,
  cityName,
  cityNameAr,
  className,
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/groups/${groupId}`);
  };

  const displayCity = isRTL ? cityNameAr : cityName;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-0">
          {/* Header with group image */}
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={groupName}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary/40" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          {/* Content */}
          <div className={cn("p-4 pt-3 space-y-3", isRTL && "text-right")}>
            {/* Group Name */}
            <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
              {groupName}
            </h3>

            {/* Organizer */}
            {organizerName && (
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Avatar className="h-6 w-6 ring-2 ring-background">
                  <AvatarImage src={organizerAvatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {organizerName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">
                  {isRTL ? 'منظم بواسطة' : 'Organized by'} {organizerName}
                </span>
              </div>
            )}

            {/* Stats Row */}
            <div className={cn("flex items-center gap-4 text-sm", isRTL && "flex-row-reverse justify-end")}>
              <div className={cn("flex items-center gap-1 text-muted-foreground", isRTL && "flex-row-reverse")}>
                <Users className="h-4 w-4" />
                <span className="font-medium text-foreground">{memberCount}</span>
                <span>{isRTL ? 'عضو' : 'members'}</span>
              </div>
              <div className={cn("flex items-center gap-1 text-muted-foreground", isRTL && "flex-row-reverse")}>
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-foreground">{eventCount}</span>
                <span>{isRTL ? 'فعالية' : 'events'}</span>
              </div>
            </div>

            {/* City */}
            {displayCity && (
              <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", isRTL && "flex-row-reverse")}>
                <MapPin className="h-3 w-3" />
                <span>{displayCity}</span>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div className={cn("flex flex-wrap gap-1", isRTL && "flex-row-reverse")}>
                {interests.slice(0, 3).map((interest, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {isRTL ? interest.name_ar : interest.name}
                  </Badge>
                ))}
                {interests.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{interests.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Join Button */}
            <Button
              variant="outline"
              className={cn("w-full mt-2 gap-2", isRTL && "flex-row-reverse")}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/groups/${groupId}`);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {isRTL ? 'عرض المجموعة' : 'View Group'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
