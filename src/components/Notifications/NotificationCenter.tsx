import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, MessageSquare, Settings, Check, X, Volume2, VolumeX, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'event' | 'reminder' | 'system' | 'promotion' | 'group_invitation';
  read: boolean;
  created_at: string;
  data?: any;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  bookingConfirmations: boolean;
  eventUpdates: boolean;
  marketingEmails: boolean;
  followerActivity: boolean;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPreferences, setShowPreferences] = useState(false);

  // Fetch real notifications from database
  const { data: notifications = [], isLoading, refetch } = useSupabaseQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch real notification preferences
  const { data: preferences, refetch: refetchPreferences } = useSupabaseQuery({
    queryKey: ['notification_preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      refetch();
      toast({
        title: "تم بنجاح",
        description: "تم تحديد جميع الإشعارات كمقروءة"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الإشعارات",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Optimistic UI update - remove from local state immediately
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      // Refetch to sync with server
      refetch();
      
      toast({
        title: "تم الحذف",
        description: "تم حذف الإشعار بنجاح"
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Refetch on error to restore correct state
      refetch();
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الإشعار",
        variant: "destructive"
      });
    }
  };

  const acceptGroupInvitation = async (notification: Notification) => {
    if (!user?.id || !notification.data?.group_id) return;

    try {
      const groupId = notification.data.group_id;

      // Get current group data
      const { data: groupData, error: fetchError } = await supabase
        .from('event_groups')
        .select('current_members, max_members')
        .eq('id', groupId)
        .single();

      if (fetchError) throw fetchError;

      // Check if group is full
      if (groupData.current_members >= groupData.max_members) {
        toast({
          title: 'خطأ',
          description: 'المجموعة ممتلئة',
          variant: 'destructive'
        });
        return;
      }

      // Add user to group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Increment current_members count
      await supabase
        .from('event_groups')
        .update({ 
          current_members: (groupData.current_members || 0) + 1
        })
        .eq('id', groupId);

      // Delete the notification
      await deleteNotification(notification.id);

      toast({
        title: 'تم بنجاح!',
        description: 'تم الانضمام للمجموعة'
      });

      refetch();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء قبول الدعوة',
        variant: 'destructive'
      });
    }
  };

  const declineGroupInvitation = async (notificationId: string) => {
    await deleteNotification(notificationId);
    toast({
      title: 'تم الرفض',
      description: 'تم رفض الدعوة'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Check className="h-4 w-4 text-green-500" />;
      case 'success': return <Check className="h-4 w-4 text-green-500" />;
      case 'reminder': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'event': return <Volume2 className="h-4 w-4 text-purple-500" />;
      case 'system': return <Settings className="h-4 w-4 text-gray-500" />;
      case 'warning': return <Bell className="h-4 w-4 text-yellow-500" />;
      case 'error': return <X className="h-4 w-4 text-red-500" />;
      case 'group_invitation': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      case 'info': return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'warning': return 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'error': return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'booking': return 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      case 'reminder': return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'event': return 'border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20';
      case 'system': return 'border-l-4 border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20';
      case 'group_invitation': return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      default: return 'border-l-4 border-l-gray-300';
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

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          [key]: value
        });

      if (error) throw error;
      
      refetchPreferences();
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تحديث تفضيلات الإشعارات بنجاح",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive"
      });
    }
  };

  if (showPreferences) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات الإشعارات
            </CardTitle>
            <Button variant="ghost" onClick={() => setShowPreferences(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            تحكم في نوع الإشعارات التي تريد استلامها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div>
            <h3 className="text-lg font-medium mb-3">قنوات الإشعارات</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">الإشعارات المباشرة</p>
                    <p className="text-sm text-muted-foreground">إشعارات فورية في المتصفح</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.push_notifications || false}
                  onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">إشعارات الإيميل</p>
                    <p className="text-sm text-muted-foreground">رسائل إلكترونية للتحديثات المهمة</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.email_notifications || false}
                  onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">الرسائل النصية</p>
                    <p className="text-sm text-muted-foreground">رسائل SMS للإشعارات العاجلة</p>
                  </div>
                </div>
                <Switch
                  checked={preferences?.sms_notifications || false}
                  onCheckedChange={(checked) => updatePreference('smsNotifications', checked)}
                />
              </div>
            </div>
          </div>

          {/* Content Preferences */}
          <div>
            <h3 className="text-lg font-medium mb-3">نوع المحتوى</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تأكيدات الحجز</p>
                  <p className="text-sm text-muted-foreground">إشعار عند تأكيد أو إلغاء الحجوزات</p>
                </div>
                <Switch
                  checked={preferences?.booking_confirmations || false}
                  onCheckedChange={(checked) => updatePreference('bookingConfirmations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تذكيرات الفعاليات</p>
                  <p className="text-sm text-muted-foreground">تذكير قبل بداية الفعاليات المحجوزة</p>
                </div>
                <Switch
                  checked={preferences?.event_reminders || false}
                  onCheckedChange={(checked) => updatePreference('eventReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تحديثات الفعاليات</p>
                  <p className="text-sm text-muted-foreground">إشعار عند تغيير تفاصيل الفعاليات</p>
                </div>
                <Switch
                  checked={preferences?.event_updates || false}
                  onCheckedChange={(checked) => updatePreference('eventUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">نشاط المتابعين</p>
                  <p className="text-sm text-muted-foreground">إشعار عند حجز أحد متابعيك لفعالية</p>
                </div>
                <Switch
                  checked={preferences?.follower_activity || false}
                  onCheckedChange={(checked) => updatePreference('followerActivity', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">الرسائل التسويقية</p>
                  <p className="text-sm text-muted-foreground">عروض وإشعارات عن فعاليات جديدة</p>
                </div>
                <Switch
                  checked={preferences?.marketing_emails || false}
                  onCheckedChange={(checked) => updatePreference('marketingEmails', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>جاري تحميل الإشعارات...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => unreadCount > 0 && markAllAsRead()}
          >
            <Bell className="h-5 w-5" />
            الإشعارات
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPreferences(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          آخر التحديثات والإشعارات
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <EmptyState 
              icon={Bell}
              title="لا توجد إشعارات"
              description="ستظهر هنا الإشعارات الجديدة"
            />
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={`p-4 rounded-lg transition-all cursor-pointer ${
                  getNotificationStyle(notification.type)
                } ${
                  !notification.read ? 'shadow-sm' : 'opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      {notification.type === 'group_invitation' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptGroupInvitation(notification);
                            }}
                          >
                            <Check className="h-4 w-4 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineGroupInvitation(notification.id);
                            }}
                          >
                            <X className="h-4 w-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {notification.type !== 'group_invitation' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};