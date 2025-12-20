import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Clock, CheckCircle, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { unreadCount, markAllAsRead } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return () => {};

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification change:', payload);
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === (payload.new as any).id ? payload.new as any : n)
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الإشعار",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      toast({
        title: "تم حذف الإشعار",
        description: "تم حذف الإشعار بنجاح"
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الإشعار",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'event_reminder':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
            <span>جاري تحميل الإشعارات...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">الإشعارات</h1>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                تحديد الكل كمقروء ({unreadCount})
              </Button>
            )}
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                الكل ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                غير مقروء ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                مقروء ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد إشعارات</h3>
                    <p className="text-muted-foreground text-center">
                      ستظهر إشعاراتك هنا عند توفرها
                    </p>
                  </CardContent>
                </Card>
              ) : (
                notifications.map((notification) => (
                  <Card key={notification.id} className={`${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{notification.title}</h3>
                              {!notification.read && (
                                <Badge variant="default" className="text-xs">جديد</Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground mb-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {unreadNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد إشعارات غير مقروءة</h3>
                    <p className="text-muted-foreground text-center">
                      جميع إشعاراتك مقروءة!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                unreadNotifications.map((notification) => (
                  <Card key={notification.id} className="border-primary/50 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{notification.title}</h3>
                              <Badge variant="default" className="text-xs">جديد</Badge>
                            </div>
                            <p className="text-muted-foreground mb-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="read" className="space-y-4">
              {readNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد إشعارات مقروءة</h3>
                  </CardContent>
                </Card>
              ) : (
                readNotifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{notification.title}</h3>
                            <p className="text-muted-foreground mb-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotificationsPage;