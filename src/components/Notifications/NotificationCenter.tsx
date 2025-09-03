import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, MessageSquare, Settings, Check, X, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'event' | 'reminder' | 'system' | 'promotion';
  read: boolean;
  timestamp: Date;
  actionUrl?: string;
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
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'تأكيد الحجز',
      message: 'تم تأكيد حجزك لفعالية "رحلة جبلية مثيرة"',
      type: 'booking',
      read: false,
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    },
    {
      id: '2', 
      title: 'تذكير الفعالية',
      message: 'فعالية "ورشة الطبخ الإيطالي" تبدأ خلال ساعة واحدة',
      type: 'reminder',
      read: false,
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
      id: '3',
      title: 'فعالية جديدة',
      message: 'تم إضافة فعالية جديدة في منطقتك: "رحلة تصوير الطبيعة"',
      type: 'event',
      read: true,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    }
  ]);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    eventReminders: true,
    bookingConfirmations: true,
    eventUpdates: true,
    marketingEmails: false,
    followerActivity: true,
  });

  const [showPreferences, setShowPreferences] = useState(false);
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Check className="h-4 w-4 text-green-500" />;
      case 'reminder': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'event': return <Volume2 className="h-4 w-4 text-purple-500" />;
      case 'system': return <Settings className="h-4 w-4 text-gray-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    } else {
      return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث تفضيلات الإشعارات بنجاح",
    });
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
                  checked={preferences.pushNotifications}
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
                  checked={preferences.emailNotifications}
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
                  checked={preferences.smsNotifications}
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
                  checked={preferences.bookingConfirmations}
                  onCheckedChange={(checked) => updatePreference('bookingConfirmations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تذكيرات الفعاليات</p>
                  <p className="text-sm text-muted-foreground">تذكير قبل بداية الفعاليات المحجوزة</p>
                </div>
                <Switch
                  checked={preferences.eventReminders}
                  onCheckedChange={(checked) => updatePreference('eventReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تحديثات الفعاليات</p>
                  <p className="text-sm text-muted-foreground">إشعار عند تغيير تفاصيل الفعاليات</p>
                </div>
                <Switch
                  checked={preferences.eventUpdates}
                  onCheckedChange={(checked) => updatePreference('eventUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">نشاط المتابعين</p>
                  <p className="text-sm text-muted-foreground">إشعار عند حجز أحد متابعيك لفعالية</p>
                </div>
                <Switch
                  checked={preferences.followerActivity}
                  onCheckedChange={(checked) => updatePreference('followerActivity', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">الرسائل التسويقية</p>
                  <p className="text-sm text-muted-foreground">عروض وإشعارات عن فعاليات جديدة</p>
                </div>
                <Switch
                  checked={preferences.marketingEmails}
                  onCheckedChange={(checked) => updatePreference('marketingEmails', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
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
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          آخر التحديثات والإشعارات
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg transition-colors ${
                  !notification.read ? 'bg-accent/50 border-primary/20' : 'bg-background'
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
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
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