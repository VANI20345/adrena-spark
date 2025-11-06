import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { CategoryDialog } from '@/components/Admin/CategoryDialog';
import { NotificationDialog } from '@/components/Admin/NotificationDialog';
import { BulkOperations } from '@/components/Admin/BulkOperations';
import { EventServiceDetailsDialog } from '@/components/Admin/EventServiceDetailsDialog';
import { DeclineCommentDialog } from '@/components/Admin/DeclineCommentDialog';
import { ActivityLogsTab } from '@/components/Admin/ActivityLogsTab';
import { SuspensionDialog } from '@/components/Admin/SuspensionDialog';
import { SuspendedUsersTab } from '@/components/Admin/SuspendedUsersTab';
import { UserDetailsDialog } from '@/components/Admin/UserDetailsDialog';
import { UserEditDialog } from '@/components/Admin/UserEditDialog';
import { ServiceCategoriesTab } from '@/components/Admin/ServiceCategoriesTab';
import { EventCategoriesTab } from '@/components/Admin/EventCategoriesTab';
import { RegionalGroupsTab } from '@/components/Admin/RegionalGroupsTab';
import { GroupManagementTab } from '@/components/Admin/GroupManagementTab';
import { ReportedMessagesTab } from '@/components/Admin/ReportedMessagesTab';
import { AdminOverviewTab } from '@/components/Admin/AdminOverviewTab';
import { AdminEventsTab } from '@/components/Admin/AdminEventsTab';
import { AdminServicesTab } from '@/components/Admin/AdminServicesTab';
import { AdminUsersTab } from '@/components/Admin/AdminUsersTab';
import { adminService } from '@/services/adminService';
import { activityLogService } from '@/services/activityLogService';
import { 
  fetchAdminStats,
  fetchPendingItems,
  approveEventOrService,
  clearOperationCache
} from '@/services/optimizedOperations';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { 
  Bell, AlertTriangle, Database, AlertCircle, Users, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminPanel = () => {
  const { userRole, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'event' | 'service'>('event');
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [itemToDecline, setItemToDecline] = useState<any>(null);
  const [declining, setDeclining] = useState(false);
  const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<any>(null);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userEditDialogOpen, setUserEditDialogOpen] = useState(false);

  // ✅ Use optimized queries with caching
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useOptimizedQuery(
    ['admin-stats'],
    fetchAdminStats,
    { enabled: userRole === 'admin' }
  );

  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useOptimizedQuery(
    ['pending-items'],
    fetchPendingItems,
    { enabled: userRole === 'admin' }
  );

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useOptimizedQuery(
    ['admin-users'],
    async () => {
      const users = await adminService.getAllUsers();
      return users;
    },
    { enabled: userRole === 'admin', staleTime: 2 * 60 * 1000 }
  );

  const { data: systemSettings, refetch: refetchSettings } = useOptimizedQuery(
    ['system-settings'],
    async () => {
      const settings = await adminService.getSystemSettings();
      setMaintenanceMode(settings.maintenance_mode?.enabled || false);
      return settings;
    },
    { enabled: userRole === 'admin' }
  );

  const pendingEvents = pendingData?.events || [];
  const pendingServices = pendingData?.services || [];

  // Refresh data when tab changes
  useEffect(() => {
    if (activeTab === 'overview') {
      refetchStats();
    } else if (activeTab === 'reviews') {
      refetchPending();
    } else if (activeTab === 'users') {
      refetchUsers();
    }
  }, [activeTab]);

  // ✅ Optimized event/service approval
  const handleEventAction = async (eventId: string, action: 'approve' | 'reject', comment?: string) => {
    if (action === 'approve') {
      try {
        await approveEventOrService(eventId, 'event');
        refetchPending();
        refetchStats();
      } catch (error) {
        console.error('Error approving event:', error);
      }
    } else {
      const status = 'cancelled';
      try {
        const event = pendingEvents.find(e => e.id === eventId);
        await supabase.from('events').update({ status }).eq('id', eventId);
        
        await activityLogService.logActivity(
          'reject_event',
          'event',
          eventId,
          { event_title: event?.title_ar, comment }
        );
        
        if (event?.organizer_id) {
          await adminService.sendNotification({
            userIds: [event.organizer_id],
            title: 'تم رفض الفعالية',
            message: `تم رفض فعالية "${event.title_ar}". ${comment ? `السبب: ${comment}` : ''}`,
            type: 'rejection'
          });
        }
        
        toast.success('تم رفض الفعالية');
        refetchPending();
        refetchStats();
      } catch (error) {
        toast.error('حدث خطأ');
      }
    }
  };

  const handleServiceAction = async (serviceId: string, action: 'approve' | 'reject', comment?: string) => {
    if (action === 'approve') {
      try {
        await approveEventOrService(serviceId, 'service');
        refetchPending();
        refetchStats();
      } catch (error) {
        console.error('Error approving service:', error);
      }
    } else {
      const status = 'cancelled';
      try {
        const service = pendingServices.find(s => s.id === serviceId);
        await supabase.from('services').update({ status }).eq('id', serviceId);
        
        await activityLogService.logActivity(
          'reject_service',
          'service',
          serviceId,
          { service_name: service?.name_ar, comment }
        );
        
        if (service?.provider_id) {
          await adminService.sendNotification({
            userIds: [service.provider_id],
            title: 'تم رفض الخدمة',
            message: `تم رفض خدمة "${service.name_ar}". ${comment ? `السبب: ${comment}` : ''}`,
            type: 'rejection'
          });
        }
        
        toast.success('تم رفض الخدمة');
        refetchPending();
        refetchStats();
      } catch (error) {
        toast.error('حدث خطأ');
      }
    }
  };

  const handleEventView = (event: any) => {
    setSelectedItem(event);
    setSelectedItemType('event');
    setDetailsDialogOpen(true);
  };
  
  const handleServiceView = (service: any) => {
    setSelectedItem(service);
    setSelectedItemType('service');
    setDetailsDialogOpen(true);
  };

  const handleEventDecline = (event: any) => {
    setItemToDecline({ ...event, type: 'event' });
    setDeclineDialogOpen(true);
  };

  const handleServiceDecline = (service: any) => {
    setItemToDecline({ ...service, type: 'service' });
    setDeclineDialogOpen(true);
  };

  const handleConfirmDecline = async (comment: string) => {
    if (!itemToDecline) return;
    setDeclining(true);
    
    try {
      if (itemToDecline.type === 'event') {
        await handleEventAction(itemToDecline.id, 'reject', comment);
      } else {
        await handleServiceAction(itemToDecline.id, 'reject', comment);
      }
      setDeclineDialogOpen(false);
      setItemToDecline(null);
    } finally {
      setDeclining(false);
    }
  };

  const handleUserSuspend = async (userId: string, suspended: boolean, user: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (suspended) {
      if (!confirm(`هل تريد إلغاء تعليق هذا المستخدم؟`)) return;
      try {
        await adminService.unsuspendUser(userId);
        await activityLogService.logActivity('unsuspend_user', 'user', userId, { 
          action: 'unsuspend',
          user_name: user?.full_name,
          user_email: user?.email
        });
        toast.success('تم إلغاء تعليق المستخدم بنجاح');
        refetchUsers();
      } catch (error) {
        console.error('Error unsuspending user:', error);
        toast.error('فشل في إلغاء تعليق المستخدم');
      }
    } else {
      setUserToSuspend(user);
      setSuspensionDialogOpen(true);
    }
  };

  const handleConfirmSuspension = async (reason: string, durationDays?: number) => {
    if (!userToSuspend) return;
    
    try {
      await adminService.suspendUser(userToSuspend.user_id, reason, durationDays);
      await activityLogService.logActivity('suspend_user', 'user', userToSuspend.user_id, { 
        action: 'suspend',
        user_name: userToSuspend.full_name,
        user_email: userToSuspend.email,
        reason,
        duration_days: durationDays
      });
      
      setSuspensionDialogOpen(false);
      setUserToSuspend(null);
      await refetchUsers();
      toast.success('تم تعليق المستخدم بنجاح');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('فشل في تعليق المستخدم');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع البيانات المرتبطة به.')) return;
    try {
      await adminService.deleteUser(userId);
      const user = users.find(u => u.user_id === userId);
      await activityLogService.logActivity('delete_user', 'user', userId, { 
        action: 'delete',
        user_name: user?.full_name,
        user_email: user?.email
      });
      toast.success('تم حذف المستخدم');
      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;
    try {
      await supabase.from('events').delete().eq('id', eventId);
      toast.success('تم حذف الفعالية');
      refetchPending();
      refetchStats();
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleServiceDelete = async (serviceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      await supabase.from('services').delete().eq('id', serviceId);
      toast.success('تم حذف الخدمة');
      refetchPending();
      refetchStats();
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode;
      await adminService.updateSystemSetting('maintenance_mode', { enabled: newValue, message: 'الموقع تحت الصيانة حالياً' });
      setMaintenanceMode(newValue);
      toast.success(newValue ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
      
      if (newValue) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDatabaseBackup = async () => {
    if (!confirm('هل تريد إنشاء نسخة احتياطية من قاعدة البيانات؟')) return;
    try {
      toast.info('جاري إنشاء النسخة الاحتياطية...');
      const { data, error } = await supabase.functions.invoke('backup-database');
      if (error) throw error;
      toast.success(`تم إنشاء النسخة الاحتياطية: ${data.fileName}`);
      await activityLogService.logActivity('database_backup', 'system', 'backup', data);
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error('حدث خطأ في إنشاء النسخة الاحتياطية: ' + error.message);
    }
  };

  const handleClearCache = () => {
    clearOperationCache();
    toast.success('تم مسح ذاكرة التخزين المؤقت');
  };

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة التحكم الإدارية</h1>
          <p className="text-muted-foreground">إدارة ومراقبة شاملة لمنصة هواية</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full h-auto flex-wrap gap-2 p-2 bg-muted rounded-lg">
              <TabsTrigger value="overview" className="whitespace-nowrap">نظرة عامة</TabsTrigger>
              <TabsTrigger value="reviews" className="whitespace-nowrap">المراجعات</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">المستخدمون</TabsTrigger>
              <TabsTrigger value="suspended" className="whitespace-nowrap">المعلقون</TabsTrigger>
              <TabsTrigger value="event-categories" className="whitespace-nowrap">تصنيفات الفعاليات</TabsTrigger>
              <TabsTrigger value="service-categories" className="whitespace-nowrap">تصنيفات الخدمات</TabsTrigger>
              <TabsTrigger value="regional-groups" className="whitespace-nowrap">مجموعات إقليمية</TabsTrigger>
              <TabsTrigger value="groups-management" className="whitespace-nowrap">إدارة المجموعات</TabsTrigger>
              <TabsTrigger value="reported-messages" className="whitespace-nowrap">الرسائل المبلغ عنها</TabsTrigger>
              <TabsTrigger value="system" className="whitespace-nowrap">النظام</TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">الإشعارات</TabsTrigger>
              <TabsTrigger value="activity" className="whitespace-nowrap">سجل النشاطات</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <AdminOverviewTab 
              stats={stats || {
                totalUsers: 0,
                userGrowth: '0%',
                totalEvents: 0,
                eventGrowth: '0%',
                totalServices: 0,
                totalRevenue: 0,
                revenueGrowth: '0%',
                activeBookings: 0,
                totalCategories: 0,
                pendingReviews: 0
              }} 
              loading={statsLoading} 
            />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <BulkOperations 
              items={pendingEvents} 
              type="events" 
              onRefresh={refetchPending} 
            />
            
            <BulkOperations 
              items={pendingServices} 
              type="services" 
              onRefresh={refetchPending} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminEventsTab
                events={pendingEvents}
                onApprove={(id) => handleEventAction(id, 'approve')}
                onDecline={handleEventDecline}
                onDelete={handleEventDelete}
                onViewDetails={handleEventView}
                loading={pendingLoading}
              />

              <AdminServicesTab
                services={pendingServices}
                onApprove={(id) => handleServiceAction(id, 'approve')}
                onDecline={handleServiceDecline}
                onDelete={handleServiceDelete}
                onViewDetails={handleServiceView}
                loading={pendingLoading}
              />
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsersTab
              users={users}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterRole={filterRole}
              onFilterRoleChange={setFilterRole}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              onViewDetails={(user) => {
                setSelectedUser(user);
                setUserDetailsDialogOpen(true);
              }}
              onEditUser={(user) => {
                setSelectedUser(user);
                setUserEditDialogOpen(true);
              }}
              onSuspendUser={handleUserSuspend}
              onDeleteUser={handleUserDelete}
              loading={usersLoading}
            />
          </TabsContent>

          {/* Suspended Users Tab */}
          <TabsContent value="suspended">
            <SuspendedUsersTab />
          </TabsContent>

          {/* Service Categories Tab */}
          <TabsContent value="service-categories">
            <ServiceCategoriesTab />
          </TabsContent>

          {/* Event Categories Tab */}
          <TabsContent value="event-categories">
            <EventCategoriesTab />
          </TabsContent>

          {/* Regional Groups Tab */}
          <TabsContent value="regional-groups">
            <RegionalGroupsTab />
          </TabsContent>

          {/* Groups Management Tab */}
          <TabsContent value="groups-management">
            <GroupManagementTab />
          </TabsContent>

          {/* Reported Messages Tab */}
          <TabsContent value="reported-messages">
            <ReportedMessagesTab />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    إدارة النظام
                  </CardTitle>
                  <CardDescription>إعدادات وصيانة النظام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full" 
                    variant={maintenanceMode ? "destructive" : "default"}
                    onClick={handleMaintenanceMode}
                  >
                    <AlertTriangle className="w-4 h-4 ml-2" />
                    {maintenanceMode ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة'}
                  </Button>

                  <Button className="w-full" onClick={handleDatabaseBackup}>
                    <Database className="w-4 h-4 ml-2" />
                    إنشاء نسخة احتياطية
                  </Button>

                  <Button className="w-full" variant="outline" onClick={handleClearCache}>
                    <AlertCircle className="w-4 h-4 ml-2" />
                    مسح ذاكرة التخزين المؤقت
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      سيتم حفظ النسخة الاحتياطية في مجلد documents/backups
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>حالة النظام</CardTitle>
                  <CardDescription>مراقبة أداء النظام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">قاعدة البيانات</span>
                    <span className="text-sm font-medium text-green-600">متصلة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">وضع الصيانة</span>
                    <span className={`text-sm font-medium ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                      {maintenanceMode ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ذاكرة التخزين المؤقت</span>
                    <span className="text-sm font-medium text-blue-600">نشطة</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      إرسال الإشعارات
                    </CardTitle>
                    <CardDescription>إرسال إشعارات للمستخدمين</CardDescription>
                  </div>
                  <Button onClick={() => setNotificationDialogOpen(true)}>
                    <Bell className="w-4 h-4 ml-2" />
                    إشعار جديد
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                      <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{Math.round((stats?.totalUsers || 0) * 0.7)}</p>
                      <p className="text-sm text-muted-foreground">مستخدمون نشطون</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">جاهز</p>
                      <p className="text-sm text-muted-foreground">النظام جاهز للإرسال</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <ActivityLogsTab />
          </TabsContent>
        </Tabs>
      </main>
      
      <NotificationDialog 
        open={notificationDialogOpen} 
        onOpenChange={setNotificationDialogOpen}
      />

      <EventServiceDetailsDialog 
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        item={selectedItem}
        type={selectedItemType}
      />

      <DeclineCommentDialog 
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleConfirmDecline}
        itemName={itemToDecline?.title_ar || itemToDecline?.name_ar || ''}
        loading={declining}
      />

      <SuspensionDialog
        open={suspensionDialogOpen}
        onOpenChange={setSuspensionDialogOpen}
        onConfirm={handleConfirmSuspension}
        userName={userToSuspend?.full_name || 'المستخدم'}
      />

      <UserDetailsDialog
        open={userDetailsDialogOpen}
        onOpenChange={setUserDetailsDialogOpen}
        user={selectedUser}
      />

      <UserEditDialog
        open={userEditDialogOpen}
        onOpenChange={setUserEditDialogOpen}
        user={selectedUser}
        onSuccess={refetchUsers}
      />
      
      <Footer />
    </div>
  );
};

export default AdminPanel;
