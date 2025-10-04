import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  BellRing, 
  Settings, 
  Check, 
  X, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Gift, 
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Trash2,
  CheckCheck,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  type: 'booking' | 'event' | 'payment' | 'social' | 'promo' | 'system' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  timestamp: Date;
  actionUrl?: string;
  actionText?: string;
  actionText_ar?: string;
  data?: any;
  image?: string;
}

interface NotificationPreferences {
  // Channels
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  
  // Content Types
  bookingUpdates: boolean;
  eventReminders: boolean;
  paymentConfirmations: boolean;
  socialActivity: boolean;
  promotionalOffers: boolean;
  systemUpdates: boolean;
  
  // Timing
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Frequency
  instantNotifications: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

interface RealTimeNotificationSystemProps {
  userId?: string;
  showSettings?: boolean;
}

const RealTimeNotificationSystem: React.FC<RealTimeNotificationSystemProps> = ({
  userId,
  showSettings = true
}) => {
  const { t, isRTL } = useLanguageContext();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    bookingUpdates: true,
    eventReminders: true,
    paymentConfirmations: true,
    socialActivity: false,
    promotionalOffers: true,
    systemUpdates: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    instantNotifications: true,
    dailyDigest: false,
    weeklyDigest: false
  });
  
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isConnected, setIsConnected] = useState(false);

  // Load notifications from database and set up real-time subscription
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (userId) {
      loadNotifications();
      cleanup = setupRealtimeSubscription();
      setIsConnected(true);
    }

    return () => {
      // Cleanup only this subscription
      if (cleanup) cleanup();
    };
  }, [userId]);

  const loadNotifications = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedNotifications: Notification[] = (data || []).map(notif => ({
        id: notif.id,
        title: notif.title,
        title_ar: notif.title,
        message: notif.message,
        message_ar: notif.message,
        type: notif.type as any,
        priority: 'medium' as any,
        read: notif.read,
        timestamp: new Date(notif.created_at),
        data: notif.data
      }));

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            title: payload.new.title,
            title_ar: payload.new.title,
            message: payload.new.message,
            message_ar: payload.new.message,
            type: payload.new.type as any,
            priority: 'medium' as any,
            read: payload.new.read,
            timestamp: new Date(payload.new.created_at),
            data: payload.new.data
          };

          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification if preferences allow
          if (preferences.inAppNotifications) {
            toast({
              title: isRTL ? newNotification.title_ar : newNotification.title,
              description: isRTL ? newNotification.message_ar : newNotification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Create new notification in database
  const createNotification = async (notificationData: {
    title: string;
    message: string;
    type: string;
    user_id: string;
    data?: any;
  }) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      
      // Real-time subscription will handle adding to local state
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconProps = {
      className: `w-5 h-5 ${priority === 'urgent' ? 'text-red-500' : 
                           priority === 'high' ? 'text-orange-500' : 
                           priority === 'medium' ? 'text-blue-500' : 'text-gray-500'}`
    };

    switch (type) {
      case 'booking': return <Calendar {...iconProps} />;
      case 'payment': return <CheckCircle {...iconProps} />;
      case 'social': return <Heart {...iconProps} />;
      case 'promo': return <Gift {...iconProps} />;
      case 'reminder': return <Clock {...iconProps} />;
      case 'system': return <Info {...iconProps} />;
      default: return <Bell {...iconProps} />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );

      toast({
        title: t('success'),
        description: t('allNotificationsMarkedRead'),
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateNotifications'),
        variant: 'destructive',
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

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );

      toast({
        title: t('success'),
        description: t('notificationDeleted'),
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: t('error'),
        description: t('failedToDeleteNotification'),
        variant: 'destructive',
      });
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const formatTimestamp = (timestamp: Date): string => {
    return formatDistanceToNow(timestamp, { 
      addSuffix: true,
      locale: isRTL ? ar : undefined
    });
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else {
        filtered = filtered.filter(n => n.type === filterType);
      }
    }
    
    return filtered.sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              {t('notifications')}
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isConnected ? t('connected') : t('disconnected')}
              </div>
              
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {t('markAllRead')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">{t('allNotifications')}</TabsTrigger>
          {showSettings && (
            <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  {t('all')} ({notifications.length})
                </Button>
                
                <Button
                  variant={filterType === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('unread')}
                >
                  {t('unread')} ({unreadCount})
                </Button>

                {['booking', 'event', 'payment', 'social', 'promo', 'reminder', 'system'].map((type) => {
                  const count = notifications.filter(n => n.type === type).length;
                  if (count === 0) return null;
                  
                  return (
                    <Button
                      key={type}
                      variant={filterType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType(type)}
                    >
                      {t(type)} ({count})
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noNotifications')}</h3>
                  <p className="text-muted-foreground">{t('noNotificationsDesc')}</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card key={notification.id} className={`transition-colors ${
                  !notification.read ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={`font-medium text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                              {isRTL ? notification.title_ar : notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {isRTL ? notification.message_ar : notification.message}
                            </p>
                          </div>
                          
                          {/* Priority Badge */}
                          {notification.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">
                              {t('urgent')}
                            </Badge>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {notification.actionUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = notification.actionUrl!}
                              >
                                {isRTL ? notification.actionText_ar : notification.actionText}
                              </Button>
                            )}
                            
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {showSettings && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t('notificationSettings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Channels */}
                <div className="space-y-4">
                  <h4 className="font-medium">{t('notificationChannels')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pushNotifications">{t('pushNotifications')}</Label>
                      <Switch
                        id="pushNotifications"
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailNotifications">{t('emailNotifications')}</Label>
                      <Switch
                        id="emailNotifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="smsNotifications">{t('smsNotifications')}</Label>
                      <Switch
                        id="smsNotifications"
                        checked={preferences.smsNotifications}
                        onCheckedChange={(checked) => updatePreference('smsNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inAppNotifications">{t('inAppNotifications')}</Label>
                      <Switch
                        id="inAppNotifications"
                        checked={preferences.inAppNotifications}
                        onCheckedChange={(checked) => updatePreference('inAppNotifications', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Content Types */}
                <div className="space-y-4">
                  <h4 className="font-medium">{t('contentTypes')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bookingUpdates">{t('bookingUpdates')}</Label>
                      <Switch
                        id="bookingUpdates"
                        checked={preferences.bookingUpdates}
                        onCheckedChange={(checked) => updatePreference('bookingUpdates', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="eventReminders">{t('eventReminders')}</Label>
                      <Switch
                        id="eventReminders"
                        checked={preferences.eventReminders}
                        onCheckedChange={(checked) => updatePreference('eventReminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="paymentConfirmations">{t('paymentConfirmations')}</Label>
                      <Switch
                        id="paymentConfirmations"
                        checked={preferences.paymentConfirmations}
                        onCheckedChange={(checked) => updatePreference('paymentConfirmations', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="socialActivity">{t('socialActivity')}</Label>
                      <Switch
                        id="socialActivity"
                        checked={preferences.socialActivity}
                        onCheckedChange={(checked) => updatePreference('socialActivity', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="promotionalOffers">{t('promotionalOffers')}</Label>
                      <Switch
                        id="promotionalOffers"
                        checked={preferences.promotionalOffers}
                        onCheckedChange={(checked) => updatePreference('promotionalOffers', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="systemUpdates">{t('systemUpdates')}</Label>
                      <Switch
                        id="systemUpdates"
                        checked={preferences.systemUpdates}
                        onCheckedChange={(checked) => updatePreference('systemUpdates', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="space-y-4">
                  <h4 className="font-medium">{t('timing')}</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="instantNotifications">{t('instantNotifications')}</Label>
                      <Switch
                        id="instantNotifications"
                        checked={preferences.instantNotifications}
                        onCheckedChange={(checked) => updatePreference('instantNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dailyDigest">{t('dailyDigest')}</Label>
                      <Switch
                        id="dailyDigest"
                        checked={preferences.dailyDigest}
                        onCheckedChange={(checked) => updatePreference('dailyDigest', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="weeklyDigest">{t('weeklyDigest')}</Label>
                      <Switch
                        id="weeklyDigest"
                        checked={preferences.weeklyDigest}
                        onCheckedChange={(checked) => updatePreference('weeklyDigest', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button className="w-full">
                  {t('saveSettings')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default RealTimeNotificationSystem;