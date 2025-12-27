import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Users, X } from 'lucide-react';
import { useSearchUsers } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import UserCard from './UserCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UserSearchProps {
  className?: string;
  onUserSelect?: (userId: string) => void;
  compact?: boolean;
  showMessageButton?: boolean;
}

const UserSearch: React.FC<UserSearchProps> = ({
  className,
  onUserSelect,
  compact = false,
  showMessageButton = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { data: users, isLoading } = useSearchUsers(searchTerm);

  const clearSearch = () => setSearchTerm('');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className={cn(
          'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors',
          isRTL ? 'right-3' : 'left-3',
          searchTerm && 'text-primary'
        )} />
        <Input
          type="text"
          placeholder={isRTL ? 'ابحث عن مستخدمين بالاسم أو المعرف...' : 'Search users by name or username...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            'h-11 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors',
            isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'
          )}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-6 w-6',
              isRTL ? 'left-2' : 'right-2'
            )}
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && searchTerm.length >= 2 && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'جاري البحث...' : 'Searching...'}
          </p>
        </div>
      )}

      {/* Results */}
      {users && users.length > 0 && (
        <div className="space-y-1">
          <p className={cn('text-xs text-muted-foreground mb-3', isRTL && 'text-right')}>
            {isRTL ? `تم العثور على ${users.length} مستخدم` : `Found ${users.length} user${users.length > 1 ? 's' : ''}`}
          </p>
          <div className={cn(compact ? 'space-y-1' : 'grid gap-4 sm:grid-cols-2')}>
            {users.map((user) => (
              <div
                key={user.user_id}
                onClick={() => onUserSelect?.(user.user_id)}
                className={onUserSelect ? 'cursor-pointer' : ''}
              >
                <UserCard
                  userId={user.user_id}
                  fullName={user.full_name}
                  displayId={user.display_id}
                  avatarUrl={user.avatar_url}
                  bio={user.bio}
                  followersCount={user.followers_count}
                  followingCount={user.following_count}
                  isPrivate={user.is_private}
                  showMessageButton={showMessageButton}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchTerm.length >= 2 && !isLoading && users?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">
            {isRTL ? 'لم يتم العثور على مستخدمين' : 'No users found'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'جرب البحث بكلمات مختلفة' : 'Try searching with different keywords'}
          </p>
        </div>
      )}

      {/* Initial State */}
      {searchTerm.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-medium mb-1">
            {isRTL ? 'ابحث عن أشخاص' : 'Find People'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isRTL 
              ? 'ابحث عن أصدقاء ومستخدمين آخرين للتواصل معهم'
              : 'Search for friends and other users to connect with'
            }
          </p>
        </div>
      )}

      {/* Minimum Characters Hint */}
      {searchTerm.length > 0 && searchTerm.length < 2 && (
        <p className={cn('text-center text-muted-foreground text-sm py-4', isRTL && 'text-right')}>
          {isRTL ? 'أدخل حرفين على الأقل للبحث' : 'Enter at least 2 characters to search'}
        </p>
      )}
    </div>
  );
};

export default UserSearch;
