import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { SuperAdminOverviewTab } from '@/components/SuperAdmin/SuperAdminOverviewTab';
import { RoleManagementTab } from '@/components/SuperAdmin/RoleManagementTab';
import { AdminPerformanceTab } from '@/components/SuperAdmin/AdminPerformanceTab';
import { FinancialDashboardTab } from '@/components/SuperAdmin/FinancialDashboardTab';
import { SuperAdminActivityLogsTab } from '@/components/SuperAdmin/SuperAdminActivityLogsTab';
import { EventActivationTab } from '@/components/SuperAdmin/EventActivationTab';
import { StaffDashboardTab } from '@/components/SuperAdmin/StaffDashboardTab';
import { CityManagementTab } from '@/components/SuperAdmin/CityManagementTab';
import { SessionManagementTab } from '@/components/SuperAdmin/SessionManagementTab';
import { SocialMediaManagementTab } from '@/components/SuperAdmin/SocialMediaManagementTab';
import { SuspiciousActivityTab } from '@/components/SuperAdmin/SuspiciousActivityTab';
import { ContactSettingsTab } from '@/components/Admin/ContactSettingsTab';
import CommissionSettingsTab from '@/components/Admin/CommissionSettingsTab';
import AdminReportsTab from '@/components/Admin/AdminReportsTab';
import { NotificationDialog } from '@/components/Admin/NotificationDialog';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  DollarSign, 
  FileText, 
  CalendarCheck,
  Shield,
  Phone,
  Percent,
  Bell,
  Database,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  MapPin,
  LogOut,
  Globe,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { fetchAdminStats, clearOperationCache } from '@/services/optimizedOperations';
import { activityLogService } from '@/services/activityLogService';

const SuperAdminPanel = () => {
  const { userRole, loading: authLoading } = useAuth();
  const { language, t, isRTL } = useLanguageContext();
  const [activeTab, setActiveTab] = useState("overview");
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useOptimizedQuery(
    ['super-admin-stats'],
    fetchAdminStats,
    { enabled: userRole === 'super_admin' }
  );

  const { data: systemSettings, refetch: refetchSettings } = useOptimizedQuery(
    ['system-settings'],
    async () => {
      const settings = await adminService.getSystemSettings();
      setMaintenanceMode(settings.maintenance_mode?.enabled || false);
      return settings;
    },
    { enabled: userRole === 'super_admin' }
  );

  const handleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode;
      await adminService.updateSystemSetting('maintenance_mode', { enabled: newValue, message: isRTL ? 'الموقع تحت الصيانة حالياً' : 'Site is under maintenance' });
      setMaintenanceMode(newValue);
      toast.success(newValue 
        ? (isRTL ? 'تم تفعيل وضع الصيانة' : 'Maintenance mode enabled')
        : (isRTL ? 'تم إيقاف وضع الصيانة' : 'Maintenance mode disabled'));
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleDatabaseBackup = async () => {
    if (!confirm(isRTL ? 'هل تريد إنشاء نسخة احتياطية من قاعدة البيانات؟' : 'Create a database backup?')) return;
    try {
      toast.info(isRTL ? 'جاري إنشاء النسخة الاحتياطية...' : 'Creating backup...');
      const { data, error } = await supabase.functions.invoke('backup-database');
      if (error) throw error;
      toast.success(isRTL ? `تم إنشاء النسخة الاحتياطية: ${data.fileName}` : `Backup created: ${data.fileName}`);
      await activityLogService.logActivity('database_backup', 'system', 'backup', data);
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(isRTL ? 'حدث خطأ في إنشاء النسخة الاحتياطية: ' + error.message : 'Backup error: ' + error.message);
    }
  };

  const handleClearCache = () => {
    clearOperationCache();
    toast.success(isRTL ? 'تم مسح ذاكرة التخزين المؤقت' : 'Cache cleared');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'overview', icon: LayoutDashboard, labelAr: 'نظرة عامة', labelEn: 'Overview' },
    { id: 'staff-dashboard', icon: Users, labelAr: 'لوحة الموظفين', labelEn: 'Staff Dashboard' },
    { id: 'reports', icon: BarChart3, labelAr: 'التقارير', labelEn: 'Reports' },
    { id: 'event-activation', icon: CalendarCheck, labelAr: 'تفعيل الفعاليات', labelEn: 'Event Activation' },
    { id: 'role-management', icon: Shield, labelAr: 'إدارة الصلاحيات', labelEn: 'Role Management' },
    { id: 'city-management', icon: MapPin, labelAr: 'إدارة المدن', labelEn: 'City Management' },
    { id: 'session-management', icon: LogOut, labelAr: 'إدارة الجلسات', labelEn: 'Session Management' },
    { id: 'social-media', icon: Globe, labelAr: 'وسائل التواصل', labelEn: 'Social Media' },
    { id: 'suspicious-activity', icon: ShieldAlert, labelAr: 'النشاط المشبوه', labelEn: 'Suspicious Activity' },
    { id: 'admin-performance', icon: TrendingUp, labelAr: 'أداء المشرفين', labelEn: 'Admin Performance' },
    { id: 'financials', icon: DollarSign, labelAr: 'لوحة المالية', labelEn: 'Financial Dashboard' },
    { id: 'contact-settings', icon: Phone, labelAr: 'إعدادات التواصل', labelEn: 'Contact Settings' },
    { id: 'commission-settings', icon: Percent, labelAr: 'إعدادات العمولة', labelEn: 'Commission Settings' },
    { id: 'system', icon: Database, labelAr: 'النظام', labelEn: 'System' },
    { id: 'notifications', icon: Bell, labelAr: 'الإشعارات', labelEn: 'Notifications' },
    { id: 'activity-logs', icon: FileText, labelAr: 'سجل النشاطات', labelEn: 'Activity Logs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {isRTL ? 'لوحة تحكم المشرف الأعلى' : 'Super Admin Panel'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة شاملة للنظام والصلاحيات والمالية - منصة Hiwaya' : 'Comprehensive system, role, and financial management - Hiwaya platform'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className={`inline-flex w-max min-w-full h-auto flex-wrap gap-2 p-2 bg-muted rounded-lg justify-start`} dir={isRTL ? 'rtl' : 'ltr'}>
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className={`whitespace-nowrap flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{isRTL ? tab.labelAr : tab.labelEn}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <SuperAdminOverviewTab onSelectTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsTab />
          </TabsContent>

          <TabsContent value="staff-dashboard">
            <StaffDashboardTab />
          </TabsContent>

          <TabsContent value="city-management">
            <CityManagementTab />
          </TabsContent>

          <TabsContent value="session-management">
            <SessionManagementTab />
          </TabsContent>

          <TabsContent value="social-media">
            <SocialMediaManagementTab />
          </TabsContent>

          <TabsContent value="suspicious-activity">
            <SuspiciousActivityTab />
          </TabsContent>

          <TabsContent value="event-activation">
            <EventActivationTab />
          </TabsContent>

          <TabsContent value="role-management">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="admin-performance">
            <AdminPerformanceTab />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialDashboardTab />
          </TabsContent>

          <TabsContent value="contact-settings">
            <ContactSettingsTab />
          </TabsContent>

          <TabsContent value="commission-settings">
            <CommissionSettingsTab isRTL={isRTL} />
          </TabsContent>

          {/* System Tab - Super Admin exclusive */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
              <Card>
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Database className="h-5 w-5" />
                    {isRTL ? 'إدارة النظام' : 'System Management'}
                  </CardTitle>
                  <CardDescription>{isRTL ? 'إعدادات وصيانة النظام' : 'System settings and maintenance'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`}
                    variant={maintenanceMode ? "destructive" : "default"}
                    onClick={handleMaintenanceMode}
                  >
                    <AlertTriangle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {maintenanceMode 
                      ? (isRTL ? 'إيقاف وضع الصيانة' : 'Disable Maintenance Mode')
                      : (isRTL ? 'تفعيل وضع الصيانة' : 'Enable Maintenance Mode')}
                  </Button>

                  <Button className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`} onClick={handleDatabaseBackup}>
                    <Database className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {isRTL ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
                  </Button>

                  <Button className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`} variant="outline" onClick={handleClearCache}>
                    <AlertCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {isRTL ? 'مسح ذاكرة التخزين المؤقت' : 'Clear Cache'}
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
                      {isRTL ? 'سيتم حفظ النسخة الاحتياطية في مجلد documents/backups' : 'Backup will be saved in documents/backups folder'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle>{isRTL ? 'حالة النظام' : 'System Status'}</CardTitle>
                  <CardDescription>{isRTL ? 'مراقبة أداء النظام' : 'Monitor system performance'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm">{isRTL ? 'قاعدة البيانات' : 'Database'}</span>
                    <span className="text-sm font-medium text-green-600">{isRTL ? 'متصلة' : 'Connected'}</span>
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm">{isRTL ? 'وضع الصيانة' : 'Maintenance Mode'}</span>
                    <span className={`text-sm font-medium ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                      {maintenanceMode 
                        ? (isRTL ? 'مفعل' : 'Enabled') 
                        : (isRTL ? 'معطل' : 'Disabled')}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm">{isRTL ? 'ذاكرة التخزين المؤقت' : 'Cache'}</span>
                    <span className="text-sm font-medium text-blue-600">{isRTL ? 'نشطة' : 'Active'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab - Super Admin exclusive */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Bell className="h-5 w-5" />
                      {isRTL ? 'إرسال الإشعارات' : 'Send Notifications'}
                    </CardTitle>
                    <CardDescription>{isRTL ? 'إرسال إشعارات للمستخدمين' : 'Send notifications to users'}</CardDescription>
                  </div>
                  <Button onClick={() => setNotificationDialogOpen(true)} className={isRTL ? 'flex-row-reverse' : ''}>
                    <Bell className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {isRTL ? 'إشعار جديد' : 'New Notification'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي الفعاليات' : 'Total Events'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{isRTL ? 'جاهز' : 'Ready'}</p>
                      <p className="text-sm text-muted-foreground">{isRTL ? 'النظام جاهز للإرسال' : 'System ready to send'}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity-logs">
            <SuperAdminActivityLogsTab />
          </TabsContent>
        </Tabs>
      </main>

      <NotificationDialog 
        open={notificationDialogOpen} 
        onOpenChange={setNotificationDialogOpen}
      />

      <Footer />
    </div>
  );
};

export default SuperAdminPanel;
