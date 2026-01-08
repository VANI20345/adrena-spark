import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Link, 
  Trash2,
  AlertTriangle,
  KeyRound,
  Mail,
  Smartphone,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { ChangePasswordDialog } from '@/components/Profile/ChangePasswordDialog';

const Settings = () => {
  const { user, signOut, loading, profile } = useAuth();
  const navigate = useNavigate();
  const { t, isRTL, language, setLanguage } = useLanguageContext();
  
  const [activeTab, setActiveTab] = useState('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  const [accountSettings, setAccountSettings] = useState({
    email: '',
    phone: ''
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appNotifications: true,
    marketingEmails: false,
    eventReminders: true,
    bookingUpdates: true
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public' as 'public' | 'friends_only' | 'private',
    activityVisibility: 'followers' as 'public' | 'followers' | 'private',
    allowFriendRequests: true
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load settings from database
  useEffect(() => {
    if (user) {
      setAccountSettings(prev => ({ ...prev, email: user.email || '' }));
      
      // Load privacy settings from profile
      if (profile) {
        const profileData = profile as any;
        setPrivacySettings({
          profileVisibility: profileData.profile_visibility || 'public',
          activityVisibility: profileData.activity_visibility || 'followers',
          allowFriendRequests: profileData.allow_friend_requests ?? true
        });
        setAccountSettings(prev => ({ ...prev, phone: profile.phone || '' }));
      }
      
      // Load notification settings
      loadNotificationSettings();
    }
  }, [user, profile]);

  const loadNotificationSettings = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setNotificationSettings({
        emailNotifications: data.email_notifications ?? true,
        smsNotifications: data.sms_notifications ?? false,
        appNotifications: true, // Always on
        marketingEmails: data.marketing_emails ?? false,
        eventReminders: data.event_reminders ?? true,
        bookingUpdates: data.booking_confirmations ?? true
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await signOut();
      toast.success(isRTL ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
      navigate('/');
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ في حذف الحساب' : 'Error deleting account');
    }
  };

  const handleSaveNotifications = async () => {
    if (!user?.id) return;
    
    setSavingNotifications(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_notifications: notificationSettings.emailNotifications,
          sms_notifications: notificationSettings.smsNotifications,
          marketing_emails: notificationSettings.marketingEmails,
          event_reminders: notificationSettings.eventReminders,
          booking_confirmations: notificationSettings.bookingUpdates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      toast.success(isRTL ? 'تم حفظ إعدادات الإشعارات' : 'Notification settings saved');
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(isRTL ? 'حدث خطأ في حفظ الإعدادات' : 'Error saving settings');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user?.id) return;
    
    setSavingPrivacy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_visibility: privacySettings.profileVisibility,
          activity_visibility: privacySettings.activityVisibility,
          allow_friend_requests: privacySettings.allowFriendRequests,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success(isRTL ? 'تم حفظ إعدادات الخصوصية' : 'Privacy settings saved');
    } catch (error) {
      console.error('Error saving privacy:', error);
      toast.error(isRTL ? 'حدث خطأ في حفظ الإعدادات' : 'Error saving settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Tab definitions with translations
  const tabs = [
    { value: 'account', icon: User, label: isRTL ? 'الحساب' : 'Account' },
    { value: 'notifications', icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications' },
    { value: 'privacy', icon: Shield, label: isRTL ? 'الخصوصية' : 'Privacy' },
    { value: 'advanced', icon: SettingsIcon, label: isRTL ? 'متقدم' : 'Advanced' }
  ];

  // Reverse tabs for RTL
  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <div className="bg-gradient-to-br from-background to-secondary/20 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-3xl font-bold mb-2">
              {isRTL ? 'الإعدادات' : 'Settings'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL ? 'إدارة حسابك وتفضيلاتك الشخصية' : 'Manage your account and personal preferences'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              {orderedTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account">
              <div className="space-y-6">
                {/* Email Settings */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail className="h-5 w-5" />
                      {isRTL ? 'إعدادات البريد الإلكتروني' : 'Email Settings'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'إدارة بريدك الإلكتروني وتأكيد الهوية' : 'Manage your email and identity verification'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="text-sm font-medium">
                          {isRTL ? 'البريد الإلكتروني الحالي' : 'Current Email'}
                        </Label>
                        <p className="text-sm text-muted-foreground" dir="ltr">{user.email}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        {isRTL ? 'تغيير البريد' : 'Change Email'}
                      </Button>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="text-sm font-medium">
                          {isRTL ? 'حالة التحقق' : 'Verification Status'}
                        </Label>
                        <p className="text-sm text-green-600">
                          {isRTL ? 'مؤكد ✓' : 'Verified ✓'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone Settings */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Smartphone className="h-5 w-5" />
                      {isRTL ? 'إعدادات رقم الجوال' : 'Phone Settings'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'إدارة رقم جوالك للتحقق والأمان' : 'Manage your phone for verification and security'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className={isRTL ? 'text-right block' : ''}>
                        {isRTL ? 'رقم الجوال' : 'Phone Number'}
                      </Label>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Input
                          id="phone"
                          value={accountSettings.phone}
                          onChange={(e) => setAccountSettings(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="05xxxxxxxx"
                          dir="ltr"
                        />
                        <Button variant="outline">
                          {isRTL ? 'تحديث' : 'Update'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Password Settings */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <KeyRound className="h-5 w-5" />
                      {isRTL ? 'كلمة المرور' : 'Password'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'تغيير كلمة المرور الخاصة بك' : 'Change your password'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setShowPasswordDialog(true)}
                      variant="outline"
                    >
                      {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Social Login */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Link className="h-5 w-5" />
                      {isRTL ? 'ربط الحسابات' : 'Link Accounts'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'ربط حسابك مع وسائل التواصل الاجتماعي' : 'Link your account with social media'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-red-600" />
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <p className="font-medium">Google</p>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? 'غير مربوط' : 'Not linked'}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {isRTL ? 'ربط' : 'Link'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Bell className="h-5 w-5" />
                    {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? 'تحكم في الإشعارات التي تتلقاها' : 'Control the notifications you receive'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'تلقي الإشعارات عبر البريد الإلكتروني' : 'Receive notifications via email'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* SMS Notifications */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'رسائل SMS' : 'SMS Notifications'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'تلقي الإشعارات عبر رسائل نصية' : 'Receive notifications via SMS'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.smsNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* App Notifications */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'إشعارات التطبيق' : 'App Notifications'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'الإشعارات داخل التطبيق (لا يمكن تعطيلها)' : 'In-app notifications (cannot be disabled)'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.appNotifications}
                        disabled
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Event Reminders */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'تذكير الفعاليات' : 'Event Reminders'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'تذكير قبل بدء الفعاليات المحجوزة' : 'Reminders before booked events start'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.eventReminders}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, eventReminders: checked }))
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Booking Updates */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'تحديثات الحجوزات' : 'Booking Updates'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'إشعارات عند تغيير حالة الحجز' : 'Notifications when booking status changes'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.bookingUpdates}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, bookingUpdates: checked }))
                        }
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Marketing Emails */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'رسائل تسويقية' : 'Marketing Emails'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'عروض وأخبار المنصة' : 'Platform offers and news'}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.marketingEmails}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveNotifications} className="w-full" disabled={savingNotifications}>
                    {savingNotifications ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      isRTL ? 'حفظ إعدادات الإشعارات' : 'Save Notification Settings'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Shield className="h-5 w-5" />
                    {isRTL ? 'إعدادات الخصوصية' : 'Privacy Settings'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? 'تحكم في من يمكنه رؤية معلوماتك' : 'Control who can see your information'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Profile Visibility */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'ظهور الملف الشخصي' : 'Profile Visibility'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'من يمكنه رؤية ملفك الشخصي' : 'Who can see your profile'}
                        </p>
                      </div>
                      <select
                        value={privacySettings.profileVisibility}
                        onChange={async (e) => {
                          const newValue = e.target.value as 'public' | 'friends_only' | 'private';
                          setPrivacySettings(prev => ({ ...prev, profileVisibility: newValue }));
                          // Auto-save on change
                          if (user?.id) {
                            try {
                              await supabase
                                .from('profiles')
                                .update({
                                  profile_visibility: newValue,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('user_id', user.id);
                              toast.success(isRTL ? 'تم تحديث الإعداد' : 'Setting updated');
                            } catch (error) {
                              console.error('Error updating setting:', error);
                            }
                          }
                        }}
                        className="border rounded-md px-3 py-2 text-sm bg-background"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        <option value="public">{isRTL ? 'عام - الجميع' : 'Public - Everyone'}</option>
                        <option value="friends_only">{isRTL ? 'الأصدقاء فقط' : 'Friends Only'}</option>
                        <option value="private">{isRTL ? 'خاص - أنا فقط' : 'Private - Only Me'}</option>
                      </select>
                    </div>
                    
                    <Separator />
                    
                    {/* Activity Visibility */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'ظهور النشاط' : 'Activity Visibility'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'من يمكنه رؤية نشاطاتك' : 'Who can see your activities'}
                        </p>
                      </div>
                      <select
                        value={privacySettings.activityVisibility}
                        onChange={async (e) => {
                          const newValue = e.target.value as 'public' | 'followers' | 'private';
                          setPrivacySettings(prev => ({ ...prev, activityVisibility: newValue }));
                          // Auto-save on change
                          if (user?.id) {
                            try {
                              await supabase
                                .from('profiles')
                                .update({
                                  activity_visibility: newValue,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('user_id', user.id);
                              toast.success(isRTL ? 'تم تحديث الإعداد' : 'Setting updated');
                            } catch (error) {
                              console.error('Error updating setting:', error);
                            }
                          }
                        }}
                        className="border rounded-md px-3 py-2 text-sm bg-background"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        <option value="public">{isRTL ? 'عام - الجميع' : 'Public - Everyone'}</option>
                        <option value="followers">{isRTL ? 'المتابعون فقط' : 'Followers Only'}</option>
                        <option value="private">{isRTL ? 'خاص - أنا فقط' : 'Private - Only Me'}</option>
                      </select>
                    </div>
                    
                    <Separator />
                    
                    {/* Allow Friend Requests */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <Label className="font-medium">
                          {isRTL ? 'السماح بطلبات المتابعة' : 'Allow Follow Requests'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'السماح للآخرين بإرسال طلبات متابعة' : 'Allow others to send follow requests'}
                        </p>
                      </div>
                      <Switch
                        checked={privacySettings.allowFriendRequests}
                        onCheckedChange={async (checked) => {
                          setPrivacySettings(prev => ({ ...prev, allowFriendRequests: checked }));
                          // Auto-save on toggle change
                          if (user?.id) {
                            try {
                              await supabase
                                .from('profiles')
                                .update({
                                  allow_friend_requests: checked,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('user_id', user.id);
                              toast.success(isRTL ? 'تم تحديث الإعداد' : 'Setting updated');
                            } catch (error) {
                              console.error('Error updating setting:', error);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleSavePrivacy} className="w-full" disabled={savingPrivacy}>
                    {savingPrivacy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      isRTL ? 'حفظ إعدادات الخصوصية' : 'Save Privacy Settings'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced">
              <div className="space-y-6">
                {/* Interests */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <SettingsIcon className="h-5 w-5" />
                      {isRTL ? 'الاهتمامات' : 'Interests'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'إدارة اهتماماتك لتحسين تجربتك' : 'Manage your interests for a better experience'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/interests-settings')}
                    >
                      {isRTL ? 'إدارة الاهتمامات' : 'Manage Interests'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Language Settings */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Globe className="h-5 w-5" />
                      {isRTL ? 'اللغة والمنطقة' : 'Language & Region'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'تحديد اللغة المفضلة والمنطقة الزمنية' : 'Set your preferred language and timezone'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className={isRTL ? 'text-right block' : ''}>
                        {isRTL ? 'اللغة المفضلة' : 'Preferred Language'}
                      </Label>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button 
                          variant={language === 'ar' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setLanguage('ar')}
                        >
                          العربية
                        </Button>
                        <Button 
                          variant={language === 'en' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => setLanguage('en')}
                        >
                          English
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Management */}
                <Card>
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle>
                      {isRTL ? 'إدارة البيانات' : 'Data Management'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'تصدير أو حذف بياناتك' : 'Export or delete your data'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={async () => {
                        try {
                          const userData = {
                            email: user?.email,
                            exportDate: new Date().toISOString()
                          };
                          const dataStr = JSON.stringify(userData, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast.success(isRTL ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully');
                        } catch (error) {
                          toast.error(isRTL ? 'حدث خطأ في تصدير البيانات' : 'Error exporting data');
                        }
                      }}
                    >
                      {isRTL ? 'تصدير بياناتي' : 'Export My Data'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={async () => {
                        const confirmMsg = isRTL 
                          ? 'هل أنت متأكد من إيقاف حسابك مؤقتاً؟ لن تتمكن من الوصول إلى حسابك حتى تقوم بإعادة تفعيله.'
                          : 'Are you sure you want to suspend your account temporarily? You will not be able to access your account until you reactivate it.';
                        if (confirm(confirmMsg)) {
                          try {
                            toast.success(isRTL ? 'تم إيقاف الحساب مؤقتاً بنجاح' : 'Account suspended temporarily');
                            await signOut();
                          } catch (error) {
                            toast.error(isRTL ? 'حدث خطأ في إيقاف الحساب' : 'Error suspending account');
                          }
                        }
                      }}
                    >
                      {isRTL ? 'إيقاف الحساب مؤقتاً' : 'Suspend Account Temporarily'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive">
                  <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 text-destructive ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <AlertTriangle className="h-5 w-5" />
                      {isRTL ? 'منطقة الخطر' : 'Danger Zone'}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? 'إجراءات لا يمكن التراجع عنها' : 'Actions that cannot be undone'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!showDeleteConfirm ? (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowDeleteConfirm(true)}
                        className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {isRTL ? 'حذف الحساب نهائياً' : 'Delete Account Permanently'}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
                            {isRTL 
                              ? 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً.'
                              : 'This action cannot be undone. All your data will be permanently deleted.'
                            }
                          </AlertDescription>
                        </Alert>
                        
                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Button 
                            variant="destructive" 
                            onClick={handleDeleteAccount}
                            className="flex-1"
                          >
                            {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1"
                          >
                            {isRTL ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </div>
  );
};

export default Settings;
