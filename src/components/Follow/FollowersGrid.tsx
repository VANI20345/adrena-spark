import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useFollowers, useFollowing } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import UserCard from './UserCard';
import { Loader2, Users, UserPlus, Heart, Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowersGridProps {
  userId: string;
  type: 'followers' | 'following';
  compact?: boolean;
  showMessageButton?: boolean;
  className?: string;
}

const FollowersGrid: React.FC<FollowersGridProps> = ({
  userId,
  type,
  compact = false,
  showMessageButton = false,
  className,
}) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: followers, isLoading: loadingFollowers } = useFollowers(type === 'followers' ? userId : undefined);
  const { data: following, isLoading: loadingFollowing } = useFollowing(type === 'following' ? userId : undefined);

  const users = type === 'followers' ? followers : following;
  const isLoading = type === 'followers' ? loadingFollowers : loadingFollowing;

  // Filter by search
  const filteredUsers = (users || []).filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
        </div>
        <p className="text-sm mt-4 font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Stats Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            {type === 'followers' ? (
              <Heart className="w-5 h-5 text-primary" />
            ) : (
              <UserPlus className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-lg">
              {type === 'followers' 
                ? (isRTL ? 'المتابعون' : 'Followers')
                : (isRTL ? 'يتابع' : 'Following')
              }
            </h2>
            <p className="text-sm text-muted-foreground">
              {users?.length || 0} {type === 'followers' 
                ? (isRTL ? 'متابع' : 'followers')
                : (isRTL ? 'يتابعهم' : 'following')
              }
            </p>
          </div>
        </div>
        
        {/* Search */}
        {(users?.length || 0) > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
              isRTL ? "right-3" : "left-3"
            )} />
            <Input
              placeholder={isRTL ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {(!users || users.length === 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex flex-col items-center justify-center py-20 text-center',
            isRTL && 'text-right'
          )}
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              {type === 'followers' ? (
                <Heart className="h-10 w-10 text-primary/60" />
              ) : (
                <UserPlus className="h-10 w-10 text-primary/60" />
              )}
            </div>
          </div>
          <h3 className="font-bold text-xl mb-2">
            {type === 'followers' 
              ? (isRTL ? 'لا يوجد متابعون بعد' : 'No followers yet')
              : (isRTL ? 'لا تتابع أحداً بعد' : 'Not following anyone yet')
            }
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {type === 'followers'
              ? (isRTL ? 'عندما يتابعك الآخرون، ستظهر حساباتهم هنا' : 'When others follow this account, they\'ll appear here')
              : (isRTL ? 'عندما تتابع حسابات أخرى، ستظهر هنا' : 'When this account follows others, they\'ll appear here')
            }
          </p>
        </motion.div>
      )}

      {/* No Search Results */}
      {users && users.length > 0 && filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
        </div>
      )}

      {/* Users Grid */}
      {filteredUsers.length > 0 && (
        <div className={cn(
          compact ? 'space-y-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
          className
        )}>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowersGrid;
