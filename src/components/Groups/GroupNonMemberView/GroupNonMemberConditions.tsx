import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GroupNonMemberConditionsProps {
  equipment?: string[] | null;
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: string | null;
  locationCity?: { name: string; name_ar: string } | null;
  isRTL: boolean;
}

export const GroupNonMemberConditions: React.FC<GroupNonMemberConditionsProps> = ({
  equipment,
  minAge,
  maxAge,
  genderRestriction,
  locationCity,
  isRTL
}) => {
  const hasConditions = minAge || maxAge || (genderRestriction && genderRestriction !== 'all') || locationCity;
  const hasEquipment = equipment && equipment.length > 0;

  if (!hasConditions && !hasEquipment) return null;

  return (
    <div className="space-y-4">
      {/* Required Equipment */}
      {hasEquipment && (
        <div>
          <h4 className="font-medium mb-2">
            {isRTL ? 'المعدات المطلوبة' : 'Required Gears'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {equipment!.map((item, idx) => (
              <Badge key={idx} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Joining Conditions */}
      {hasConditions && (
        <div>
          <h4 className="font-medium mb-2">
            {isRTL ? 'شروط الانضمام' : 'Joining Conditions'}
          </h4>
          <div className="space-y-2">
            {/* Age Restriction */}
            {(minAge || maxAge) && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {isRTL ? 'العمر' : 'Age'}
                </Badge>
                <span className="text-muted-foreground">
                  {minAge && maxAge
                    ? `${minAge} - ${maxAge} ${isRTL ? 'سنة' : 'years'}`
                    : minAge
                    ? `${isRTL ? 'من' : 'From'} ${minAge} ${isRTL ? 'سنة' : 'years'}`
                    : `${isRTL ? 'حتى' : 'Up to'} ${maxAge} ${isRTL ? 'سنة' : 'years'}`}
                </span>
              </div>
            )}
            
            {/* Gender Restriction */}
            {genderRestriction && genderRestriction !== 'all' && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {isRTL ? 'الجنس' : 'Gender'}
                </Badge>
                <span className="text-muted-foreground">
                  {genderRestriction === 'male'
                    ? (isRTL ? 'ذكور فقط' : 'Males Only')
                    : (isRTL ? 'إناث فقط' : 'Females Only')}
                </span>
              </div>
            )}
            
            {/* Location Restriction */}
            {locationCity && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {isRTL ? 'الموقع' : 'Location'}
                </Badge>
                <span className="text-muted-foreground">
                  {isRTL ? locationCity.name_ar : locationCity.name}
                </span>
              </div>
            )}

            {!minAge && !maxAge && (!genderRestriction || genderRestriction === 'all') && !locationCity && (
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'لا توجد شروط خاصة للانضمام' : 'No special conditions'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
