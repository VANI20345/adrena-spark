import React from 'react';
import { Users } from 'lucide-react';

interface GroupNonMemberThumbnailProps {
  imageUrl?: string | null;
  groupName: string;
}

export const GroupNonMemberThumbnail: React.FC<GroupNonMemberThumbnailProps> = ({ 
  imageUrl, 
  groupName 
}) => {
  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={groupName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
          <Users className="w-24 h-24 text-primary/40" />
        </div>
      )}
    </div>
  );
};
