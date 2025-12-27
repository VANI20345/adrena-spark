import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Trash2, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { unreadCount, markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id && isOpen) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user?.id, isOpen]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-dropdown-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 9)]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev =>
              prev.filter(n => n.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Optimistically update UI immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        // Revert on error by refetching
        fetchNotifications();
        throw error;
      }
      
      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الإشعار',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف الإشعار',
        variant: 'destructive'
      });
    }
  };

  const acceptGroupInvitation = async (notification: Notification) => {
    if (!user?.id || !notification.data?.group_id) return;

    try {
      const groupId = notification.data.group_id;

      const { data: groupData, error: fetchError } = await supabase
        .from('event_groups')
        .select('current_members, max_members')
        .eq('id', groupId)
        .single();

      if (fetchError) throw fetchError;

      if (groupData.current_members >= groupData.max_members) {
        toast({
          title: 'خطأ',
          description: 'المجموعة ممتلئة',
          variant: 'destructive'
        });
        return;
      }

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      await supabase
        .from('event_groups')
        .update({ 
          current_members: (groupData.current_members || 0) + 1
        })
        .eq('id', groupId);

      await deleteNotification(notification.id);

      toast({
        title: 'تم بنجاح!',
        description: 'تم الانضمام للمجموعة'
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء قبول الدعوة',
        variant: 'destructive'
      });
    }
  };

  const acceptFriendRequest = async (notification: Notification) => {
    if (!notification.data?.request_id) return;

    try {
      const { error } = await supabase.functions.invoke('manage-friend-request', {
        body: { request_id: notification.data.request_id, action: 'accept' }
      });

      if (error) throw error;

      await deleteNotification(notification.id);

      toast({
        title: 'تم قبول الطلب',
        description: 'أصبحتما أصدقاء الآن'
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: 'خطأ',
        description: 'فشل قبول طلب الصداقة',
        variant: 'destructive'
      });
    }
  };

  const declineRequest = async (notificationId: string) => {
    await deleteNotification(notificationId);
    toast({
      title: 'تم الرفض',
      description: 'تم رفض الطلب'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'friend_accepted': return <Check className="h-4 w-4 text-green-500" />;
      case 'friend_message': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'event_shared': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'group_invitation': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'booking': return <Check className="h-4 w-4 text-green-500" />;
      case 'success': return <Check className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    } else {
      return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
  };

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    // Mark all as read when opening the dropdown
    if (open && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-background z-50" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">الإشعارات</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                markAllAsRead();
                fetchNotifications();
              }}
            >
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-1">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(notification.created_at)}
                      </p>
                      
                      {notification.type === 'group_invitation' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptGroupInvitation(notification);
                            }}
                          >
                            <Check className="h-3 w-3 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineRequest(notification.id);
                            }}
                          >
                            <X className="h-3 w-3 ml-1" />
                            رفض
                          </Button>
                        </div>
                      )}
                      {notification.type === 'friend_request' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptFriendRequest(notification);
                            }}
                          >
                            <Check className="h-3 w-3 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineRequest(notification.id);
                            }}
                          >
                            <X className="h-3 w-3 ml-1" />
                            رفض
                          </Button>
                        </div>
                      )}
                      {notification.type === 'event_shared' && notification.data?.event_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/event/${notification.data.event_id}`;
                          }}
                        >
                          عرض الفعالية
                        </Button>
                      )}
                      {notification.type === 'friend_message' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = '/friends';
                          }}
                        >
                          عرض الرسالة
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              عرض جميع الإشعارات
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
