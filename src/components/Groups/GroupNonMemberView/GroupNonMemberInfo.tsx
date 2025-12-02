import React from 'react';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GroupNonMemberInfoProps {
  groupName: string;
  location?: { name: string; name_ar: string } | null;
  memberCount: number;
  description?: string | null;
  interests?: Array<{ name: string; name_ar: string }>;
  isRTL: boolean;
}

export const GroupNonMemberInfo: React.FC<GroupNonMemberInfoProps> = ({
  groupName,
  location,
  memberCount,
  description,
  interests,
  isRTL
}) => {
  return (
    <div className="space-y-4">
      {/* Group Name & Location */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{groupName}</h2>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {location ? (isRTL ? location.name_ar : location.name) : (isRTL ? 'السعودية' : 'Saudi Arabia')}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {memberCount} {isRTL ? 'عضو' : 'members'}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {isRTL ? 'نبذة عن المجموعة' : 'About this Group'}
        </h3>
        {description ? (
          <p className="text-muted-foreground whitespace-pre-wrap break-words">{description}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {isRTL ? 'لا يوجد وصف لهذه المجموعة' : 'No description available'}
          </p>
        )}
      </div>

      {/* Group Interests */}
      {interests && interests.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">
            {isRTL ? 'اهتمامات المجموعة' : 'Group Interests'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest, idx) => (
              <Badge key={idx} variant="secondary">
                {isRTL ? interest.name_ar : interest.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
