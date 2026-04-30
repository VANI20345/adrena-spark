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
import { useLanguageContext } from '@/contexts/LanguageContext';
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
  const { language, isRTL } = useLanguageContext();
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
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل حذف الإشعار' : 'Failed to delete notification',
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
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'المجموعة ممتلئة' : 'Group is full',
          variant: 'destructive'
        });
        return;
      }

      const { error: memberError } = await supabase
        .from('group_memberships')
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
        title: language === 'ar' ? 'تم بنجاح!' : 'Success!',
        description: language === 'ar' ? 'تم الانضمام للمجموعة' : 'Joined the group'
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ أثناء قبول الدعوة' : 'Error accepting invitation',
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
        title: language === 'ar' ? 'تم قبول الطلب' : 'Request accepted',
        description: language === 'ar' ? 'أصبحتما أصدقاء الآن' : 'You are now friends'
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل قبول طلب الصداقة' : 'Failed to accept friend request',
        variant: 'destructive'
      });
    }
  };

  const declineRequest = async (notificationId: string) => {
    await deleteNotification(notificationId);
    toast({
      title: language === 'ar' ? 'تم الرفض' : 'Declined',
      description: language === 'ar' ? 'تم رفض الطلب' : 'Request declined'
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
    
    if (language === 'ar') {
      if (diffInMinutes < 60) {
        return `منذ ${diffInMinutes} دقيقة`;
      } else if (diffInMinutes < 1440) {
        return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
      } else {
        return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
      }
    } else {
      if (diffInMinutes < 60) {
        return `${diffInMinutes} min ago`;
      } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)} hours ago`;
      } else {
        return `${Math.floor(diffInMinutes / 1440)} days ago`;
      }
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
      <PopoverContent className="w-96 p-0 bg-background z-50" align="end" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                markAllAsRead();
                fetchNotifications();
              }}
            >
              {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
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
                            <Check className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'قبول' : 'Accept'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineRequest(notification.id);
                            }}
                          >
                            <X className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'رفض' : 'Decline'}
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
                            <Check className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'قبول' : 'Accept'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineRequest(notification.id);
                            }}
                          >
                            <X className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'رفض' : 'Decline'}
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
                          {language === 'ar' ? 'عرض الفعالية' : 'View Event'}
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
                          {language === 'ar' ? 'عرض الرسالة' : 'View Message'}
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
              {language === 'ar' ? 'عرض جميع الإشعارات' : 'View all notifications'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
