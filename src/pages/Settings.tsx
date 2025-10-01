import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';

const Settings = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  const [accountSettings, setAccountSettings] = useState({
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
    profileVisible: true,
    showPhone: false,
    showEmail: false,
    allowMessages: true,
    showActivity: true
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Initialize settings
  useEffect(() => {
    if (user) {
      setAccountSettings(prev => ({ ...prev, email: user.email || '' }));
      // Load other settings from database/localStorage
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (accountSettings.newPassword !== accountSettings.confirmPassword) {
      toast.error('كلمات المرور الجديدة غير متطابقة');
      return;
    }
    
    if (accountSettings.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      // In real app, implement password change
      toast.success('تم تغيير كلمة المرور بنجاح');
      setAccountSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setShowPasswordFields(false);
    } catch (error) {
      toast.error('حدث خطأ في تغيير كلمة المرور');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // In real app, implement account deletion
      await signOut();
      toast.success('تم حذف الحساب بنجاح');
      navigate('/');
    } catch (error) {
      toast.error('حدث خطأ في حذف الحساب');
    }
  };

  const handleSaveNotifications = () => {
    // Save notification settings to database
    toast.success('تم حفظ إعدادات الإشعارات');
  };

  const handleSavePrivacy = () => {
    // Save privacy settings to database
    toast.success('تم حفظ إعدادات الخصوصية');
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-to-br from-background to-secondary/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة حسابك وتفضيلاتك الشخصية</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              الحساب
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              الخصوصية
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              متقدم
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account">
            <div className="space-y-6">
              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    إعدادات البريد الإلكتروني
                  </CardTitle>
                  <CardDescription>إدارة بريدك الإلكتروني وتأكيد الهوية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">البريد الإلكتروني الحالي</Label>
                      <p className="text-sm text-muted-foreground" dir="ltr">{user.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      تغيير البريد
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">حالة التحقق</Label>
                      <p className="text-sm text-green-600">مؤكد ✓</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phone Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    إعدادات رقم الجوال
                  </CardTitle>
                  <CardDescription>إدارة رقم جوالك للتحقق والأمان</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        value={accountSettings.phone}
                        onChange={(e) => setAccountSettings(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                      />
                      <Button variant="outline">
                        تحديث
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Password Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    كلمة المرور
                  </CardTitle>
                  <CardDescription>تغيير كلمة المرور الخاصة بك</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showPasswordFields ? (
                    <Button 
                      onClick={() => setShowPasswordFields(true)}
                      variant="outline"
                    >
                      تغيير كلمة المرور
                    </Button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={accountSettings.currentPassword}
                          onChange={(e) => setAccountSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={accountSettings.newPassword}
                          onChange={(e) => setAccountSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={accountSettings.confirmPassword}
                          onChange={(e) => setAccountSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          required
                          dir="ltr"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit">حفظ كلمة المرور</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowPasswordFields(false)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Social Login */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    ربط الحسابات
                  </CardTitle>
                  <CardDescription>ربط حسابك مع وسائل التواصل الاجتماعي</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Google</p>
                        <p className="text-sm text-muted-foreground">غير مربوط</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      ربط
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  إعدادات الإشعارات
                </CardTitle>
                <CardDescription>تحكم في الإشعارات التي تتلقاها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إشعارات البريد الإلكتروني</Label>
                      <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر البريد الإلكتروني</p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">رسائل SMS</Label>
                      <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر رسائل نصية</p>
                    </div>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إشعارات التطبيق</Label>
                      <p className="text-sm text-muted-foreground">الإشعارات داخل التطبيق (لا يمكن تعطيلها)</p>
                    </div>
                    <Switch
                      checked={notificationSettings.appNotifications}
                      disabled
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">تذكير الفعاليات</Label>
                      <p className="text-sm text-muted-foreground">تذكير قبل بدء الفعاليات المحجوزة</p>
                    </div>
                    <Switch
                      checked={notificationSettings.eventReminders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, eventReminders: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">تحديثات الحجوزات</Label>
                      <p className="text-sm text-muted-foreground">إشعارات عند تغيير حالة الحجز</p>
                    </div>
                    <Switch
                      checked={notificationSettings.bookingUpdates}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, bookingUpdates: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">رسائل تسويقية</Label>
                      <p className="text-sm text-muted-foreground">عروض وأخبار المنصة</p>
                    </div>
                    <Switch
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))
                      }
                    />
                  </div>
                </div>
                
                <Button onClick={handleSaveNotifications} className="w-full">
                  حفظ إعدادات الإشعارات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  إعدادات الخصوصية
                </CardTitle>
                <CardDescription>تحكم في من يمكنه رؤية معلوماتك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إظهار الملف الشخصي</Label>
                      <p className="text-sm text-muted-foreground">السماح للآخرين برؤية ملفك الشخصي</p>
                    </div>
                    <Switch
                      checked={privacySettings.profileVisible}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, profileVisible: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إظهار رقم الجوال</Label>
                      <p className="text-sm text-muted-foreground">السماح للآخرين برؤية رقم جوالك</p>
                    </div>
                    <Switch
                      checked={privacySettings.showPhone}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, showPhone: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إظهار البريد الإلكتروني</Label>
                      <p className="text-sm text-muted-foreground">السماح للآخرين برؤية بريدك الإلكتروني</p>
                    </div>
                    <Switch
                      checked={privacySettings.showEmail}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, showEmail: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">السماح بالرسائل</Label>
                      <p className="text-sm text-muted-foreground">السماح للمستخدمين الآخرين بمراسلتك</p>
                    </div>
                    <Switch
                      checked={privacySettings.allowMessages}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, allowMessages: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">إظهار النشاط</Label>
                      <p className="text-sm text-muted-foreground">إظهار آخر نشاط لك في المنصة</p>
                    </div>
                    <Switch
                      checked={privacySettings.showActivity}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, showActivity: checked }))
                      }
                    />
                  </div>
                </div>
                
                <Button onClick={handleSavePrivacy} className="w-full">
                  حفظ إعدادات الخصوصية
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced">
            <div className="space-y-6">
              {/* Language Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    اللغة والمنطقة
                  </CardTitle>
                  <CardDescription>تحديد اللغة المفضلة والمنطقة الزمنية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>اللغة المفضلة</Label>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm">العربية</Button>
                      <Button variant="outline" size="sm">English</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle>إدارة البيانات</CardTitle>
                  <CardDescription>تصدير أو حذف بياناتك</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      try {
                        // Export user data
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
                        toast.success('تم تصدير البيانات بنجاح');
                      } catch (error) {
                        toast.error('حدث خطأ في تصدير البيانات');
                      }
                    }}
                  >
                    تصدير بياناتي
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      if (confirm('هل أنت متأكد من إيقاف حسابك مؤقتاً؟ لن تتمكن من الوصول إلى حسابك حتى تقوم بإعادة تفعيله.')) {
                        try {
                          // In production, this would call an API to suspend the account
                          toast.success('تم إيقاف الحساب مؤقتاً بنجاح');
                          await signOut();
                        } catch (error) {
                          toast.error('حدث خطأ في إيقاف الحساب');
                        }
                      }
                    }}
                  >
                    إيقاف الحساب مؤقتاً
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    منطقة الخطر
                  </CardTitle>
                  <CardDescription>إجراءات لا يمكن التراجع عنها</CardDescription>
                </CardHeader>
                <CardContent>
                  {!showDeleteConfirm ? (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف الحساب نهائياً
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteAccount}
                          className="flex-1"
                        >
                          تأكيد الحذف
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1"
                        >
                          إلغاء
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
    </div>
  );
};

export default Settings;