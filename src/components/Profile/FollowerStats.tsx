import { Users, UserPlus, UserMinus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFollowers } from '@/hooks/useFollowers';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface FollowerStatsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export const FollowerStats = ({ userId, isOwnProfile = false }: FollowerStatsProps) => {
  const { user } = useAuth();
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  
  const { 
    followers_count, 
    following_count, 
    isFollowing, 
    canFollow,
    isAdmin,
    loading,
    followUser,
    unfollowUser 
  } = useFollowers(userId);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      setIsCurrentUserAdmin(!!data);
    };

    checkAdminStatus();
  }, [user]);

  // Don't show stats for admin profiles unless viewer is admin
  if (isAdmin && !isCurrentUserAdmin) {
    return null;
  }

  const handleFollowClick = async () => {
    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{followers_count}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-4 h-4" />
                متابعون
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{following_count}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-4 h-4" />
                يتابع
              </div>
            </div>

            {isAdmin && (
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                مسؤول
              </Badge>
            )}
          </div>

          {!isOwnProfile && user && canFollow && (
            <Button
              onClick={handleFollowClick}
              disabled={loading}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="gap-2"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  إلغاء المتابعة
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  متابعة
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
