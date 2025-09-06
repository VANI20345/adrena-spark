import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  Star,
  Settings,
  Mail,
  Phone,
  Check,
  X,
  Trash2,
  BellOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';

interface Notification {
  id: string;
  type: 'event' | 'booking' | 'group' | 'system' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
  action_url?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  event_reminders: boolean;
  booking_confirmations: boolean;
  group_messages: boolean;
  promotional_messages: boolean;
  follower_activity: boolean;
  sound_enabled: boolean;
}

const Notifications = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: true,
    event_reminders: true,
    booking_confirmations: true,
    group_messages: true,
    promotional_messages: false,
    follower_activity: true,
    sound_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadSettings();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      // Mock notifications data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'booking',
          title: language === 'ar' ? 'تأكيد الحجز' : 'Booking Confirmed',
          message: language === 'ar' ? 
            'تم تأكيد حجزك لفعالية "رحلة جبال الطائف الاستكشافية" بنجاح' :
            'Your booking for "Taif Mountains Exploration" has been confirmed',
          read: false,
          created_at: '2024-01-15T10:30:00Z',
          data: { event_id: 'event1', booking_id: 'booking1' },
          action_url: '/my-events'
        },
        {
          id: '2',
          type: 'group',
          title: language === 'ar' ? 'رسالة جديدة في المجموعة' : 'New Group Message',
          message: language === 'ar' ? 
            'رسالة جديدة في مجموعة "عشاق المغامرات - الرياض"' :
            'New message in "Adventure Lovers - Riyadh" group',
          read: false,
          created_at: '2024-01-15T09:15:00Z',
          data: { group_id: 'group1' },
          action_url: '/groups'
        },
        {
          id: '3',
          type: 'event',
          title: language === 'ar' ? 'تذكير بالفعالية' : 'Event Reminder',
          message: language === 'ar' ? 
            'تذكير: فعالية "تسلق جبل شدا" ستبدأ غداً في الساعة 6:00 صباحاً' :
            'Reminder: "Shada Mountain Climbing" starts tomorrow at 6:00 AM',
          read: true,
          created_at: '2024-01-14T18:00:00Z',
          data: { event_id: 'event2' },
          action_url: '/event-details/event2'
        },
        {
          id: '4',
          type: 'system',
          title: language === 'ar' ? 'نقاط الولاء الجديدة' : 'New Loyalty Points',
          message: language === 'ar' ? 
            'تم إضافة 25 نقطة ولاء إلى حسابك بعد مشاركتك في الفعالية' :
            '25 loyalty points added to your account after event participation',
          read: true,
          created_at: '2024-01-13T14:22:00Z',
          data: { points: 25 },
          action_url: '/points'
        },
        {
          id: '5',
          type: 'promotion',
          title: language === 'ar' ? 'عروض خاصة' : 'Special Offers',
          message: language === 'ar' ? 
            'خصم 20% على جميع فعاليات التخييم هذا الأسبوع!' :
            '20% off on all camping events this week!',
          read: false,
          created_at: '2024-01-12T12:00:00Z',
          action_url: '/explore?category=camping'
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحميل الإشعارات' : 'Failed to load notifications',
        variant: 'destructive'
      });
    }
  };

  const loadSettings = async () => {
    try {
      // Load from API or localStorage
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      // API call to mark as read
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All notifications marked as read'
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحديث الإشعارات' : 'Failed to update notifications',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted'
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حذف الإشعار' : 'Failed to delete notification',
        variant: 'destructive'
      });
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
      
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ إعدادات الإشعارات' : 'Notification settings saved'
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'booking': return <Check className="w-4 h-4" />;
      case 'group': return <MessageSquare className="w-4 h-4" />;
      case 'system': return <Bell className="w-4 h-4" />;
      case 'promotion': return <Star className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'event': return 'text-blue-500';
      case 'booking': return 'text-green-500';
      case 'group': return 'text-purple-500';
      case 'system': return 'text-orange-500';
      case 'promotion': return 'text-pink-500';
      default: return 'text-gray-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return language === 'ar' ? 'الآن' : 'Now';
    if (diffInMinutes < 60) return language === 'ar' ? `منذ ${diffInMinutes} دقيقة` : `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return language === 'ar' ? `منذ ${Math.floor(diffInMinutes / 60)} ساعة` : `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterNotifications = (type: string) => {
    if (type === 'all') return notifications;
    if (type === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === type);
  };

  const filteredNotifications = filterNotifications(activeTab);
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {language === 'ar' ? 'يرجى تسجيل الدخول' : 'Please sign in'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {language === 'ar' ? 'تحتاج إلى تسجيل الدخول لرؤية الإشعارات' : 'You need to sign in to view notifications'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تابع آخر التحديثات والأنشطة' : 'Stay updated with latest activities'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All Read'}
              </Button>
            )}
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'الإعدادات' : 'Settings'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">
              {language === 'ar' ? 'الكل' : 'All'} ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              {language === 'ar' ? 'غير مقروء' : 'Unread'} ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="event">
              {language === 'ar' ? 'الفعاليات' : 'Events'}
            </TabsTrigger>
            <TabsTrigger value="group">
              {language === 'ar' ? 'المجموعات' : 'Groups'}
            </TabsTrigger>
            <TabsTrigger value="booking">
              {language === 'ar' ? 'الحجوزات' : 'Bookings'}
            </TabsTrigger>
            <TabsTrigger value="settings">
              {language === 'ar' ? 'الإعدادات' : 'Settings'}
            </TabsTrigger>
          </TabsList>

          {/* Notifications List */}
          {['all', 'unread', 'event', 'group', 'booking', 'system', 'promotion'].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filterNotifications(tabValue).map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`hover:shadow-md transition-shadow cursor-pointer ${
                        !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {notification.type}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-12">
                      <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {language === 'ar' ? 'لا توجد إشعارات' : 'No Notifications'}
                      </h3>
                      <p className="text-muted-foreground">
                        {activeTab === 'unread' ? 
                          (language === 'ar' ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications') :
                          (language === 'ar' ? 'لا توجد إشعارات في هذه الفئة' : 'No notifications in this category')
                        }
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {language === 'ar' ? 'إعدادات البريد الإلكتروني والرسائل النصية' : 'Email & SMS Settings'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'تحكم في طريقة تلقي الإشعارات' : 'Control how you receive notifications'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تلقي الإشعارات عبر البريد الإلكتروني' : 'Receive notifications via email'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'الرسائل النصية' : 'SMS Notifications'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تلقي الإشعارات عبر الرسائل النصية' : 'Receive notifications via SMS'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={(checked) => updateSettings({ sms_notifications: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'الصوت' : 'Sound'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تشغيل صوت عند وصول إشعارات جديدة' : 'Play sound for new notifications'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.sound_enabled}
                    onCheckedChange={(checked) => updateSettings({ sound_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'أنواع الإشعارات' : 'Notification Types'}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'اختر أنواع الإشعارات التي تريد تلقيها' : 'Choose which types of notifications you want to receive'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'تذكير الفعاليات' : 'Event Reminders'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تذكير قبل بدء الفعاليات' : 'Reminders before events start'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.event_reminders}
                    onCheckedChange={(checked) => updateSettings({ event_reminders: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'تأكيدات الحجز' : 'Booking Confirmations'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'تأكيد الحجوزات والدفعات' : 'Booking and payment confirmations'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.booking_confirmations}
                    onCheckedChange={(checked) => updateSettings({ booking_confirmations: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'رسائل المجموعات' : 'Group Messages'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'رسائل جديدة في المجموعات' : 'New messages in groups'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.group_messages}
                    onCheckedChange={(checked) => updateSettings({ group_messages: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      {language === 'ar' ? 'الرسائل الترويجية' : 'Promotional Messages'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'العروض الخاصة والخصومات' : 'Special offers and discounts'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.promotional_messages}
                    onCheckedChange={(checked) => updateSettings({ promotional_messages: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Notifications;