import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
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
import { Enhanced360UserDialog } from '@/components/Admin/Enhanced360UserDialog';
import { UserEditDialog } from '@/components/Admin/UserEditDialog';
import { ServiceCategoriesTab } from '@/components/Admin/ServiceCategoriesTab';
import { EventCategoriesTab } from '@/components/Admin/EventCategoriesTab';
import { GroupManagementTab } from '@/components/Admin/GroupManagementTab';
import { UnifiedTicketsTab } from '@/components/Admin/UnifiedTicketsTab';
import { EntityReportsTab } from '@/components/Admin/EntityReportsTab';
import { AdminEventsTab } from '@/components/Admin/AdminEventsTab';
import { AdminServicesTab } from '@/components/Admin/AdminServicesTab';
import { AdminUsersTab } from '@/components/Admin/AdminUsersTab';
import { ProviderVerificationTab } from '@/components/Admin/ProviderVerificationTab';
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
  const { language, t } = useLanguageContext();
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState("reviews");
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
  
  // Track action states to prevent double-clicks
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

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

  const { data: pendingProviders = [], isLoading: providersLoading, refetch: refetchProviders } = useOptimizedQuery(
    ['pending-providers'],
    async () => {
      const providers = await adminService.getPendingProviders();
      return providers;
    },
    { enabled: userRole === 'admin', staleTime: 2 * 60 * 1000 }
  );

  const pendingEvents = pendingData?.events || [];
  const pendingServices = pendingData?.services || [];

  useEffect(() => {
    if (activeTab === 'reviews') {
      refetchPending();
    } else if (activeTab === 'users') {
      refetchUsers();
    } else if (activeTab === 'provider-verification') {
      refetchProviders();
    }
  }, [activeTab]);

  // Helper to check if an action is in progress
  const isActionInProgress = useCallback((id: string) => actionInProgress[id] || false, [actionInProgress]);
  
  // Helper to set action state
  const setActionState = useCallback((id: string, inProgress: boolean) => {
    setActionInProgress(prev => ({ ...prev, [id]: inProgress }));
  }, []);

  // Optimized event approval with protection against double-clicks
  const handleEventAction = useCallback(async (eventId: string, action: 'approve' | 'reject', comment?: string) => {
    if (isActionInProgress(eventId)) return;
    
    setActionState(eventId, true);
    
    try {
      if (action === 'approve') {
        await approveEventOrService(eventId, 'event');
        toast.success(isRTL ? 'تم قبول الفعالية' : 'Event approved');
      } else {
        const event = pendingEvents.find(e => e.id === eventId);
        await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
        
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
        
        toast.success(isRTL ? 'تم رفض الفعالية' : 'Event rejected');
      }
      refetchPending();
      refetchStats();
    } catch (error) {
      console.error('Error handling event action:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setActionState(eventId, false);
    }
  }, [isActionInProgress, setActionState, pendingEvents, refetchPending, refetchStats, isRTL]);

  // Optimized service approval with protection against double-clicks
  const handleServiceAction = useCallback(async (serviceId: string, action: 'approve' | 'reject', comment?: string) => {
    if (isActionInProgress(serviceId)) return;
    
    setActionState(serviceId, true);
    
    try {
      if (action === 'approve') {
        await approveEventOrService(serviceId, 'service');
        toast.success(isRTL ? 'تم قبول الخدمة' : 'Service approved');
      } else {
        const service = pendingServices.find(s => s.id === serviceId);
        await supabase.from('services').update({ status: 'cancelled' }).eq('id', serviceId);
        
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
        
        toast.success(isRTL ? 'تم رفض الخدمة' : 'Service rejected');
      }
      refetchPending();
      refetchStats();
    } catch (error) {
      console.error('Error handling service action:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setActionState(serviceId, false);
    }
  }, [isActionInProgress, setActionState, pendingServices, refetchPending, refetchStats, isRTL]);

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
      if (!confirm(isRTL ? 'هل تريد إلغاء تعليق هذا المستخدم؟' : 'Unsuspend this user?')) return;
      try {
        await adminService.unsuspendUser(userId);
        await activityLogService.logActivity('unsuspend_user', 'user', userId, { 
          action: 'unsuspend',
          user_name: user?.full_name,
          user_email: user?.email
        });
        toast.success(isRTL ? 'تم إلغاء تعليق المستخدم بنجاح' : 'User unsuspended');
        refetchUsers();
      } catch (error) {
        console.error('Error unsuspending user:', error);
        toast.error(isRTL ? 'فشل في إلغاء تعليق المستخدم' : 'Failed to unsuspend');
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
      toast.success(isRTL ? 'تم تعليق المستخدم بنجاح' : 'User suspended');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error(isRTL ? 'فشل في تعليق المستخدم' : 'Failed to suspend');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع البيانات المرتبطة به.' : 'Delete user and all related data?')) return;
    try {
      await adminService.deleteUser(userId);
      const user = users.find(u => u.user_id === userId);
      await activityLogService.logActivity('delete_user', 'user', userId, { 
        action: 'delete',
        user_name: user?.full_name,
        user_email: user?.email
      });
      toast.success(isRTL ? 'تم حذف المستخدم' : 'User deleted');
      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(isRTL ? 'حدث خطأ في الحذف' : 'Delete failed');
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفعالية؟' : 'Delete this event?')) return;
    try {
      await supabase.from('events').delete().eq('id', eventId);
      toast.success(isRTL ? 'تم حذف الفعالية' : 'Event deleted');
      refetchPending();
      refetchStats();
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ في الحذف' : 'Delete failed');
    }
  };

  const handleServiceDelete = async (serviceId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه الخدمة؟' : 'Delete this service?')) return;
    try {
      await supabase.from('services').delete().eq('id', serviceId);
      toast.success(isRTL ? 'تم حذف الخدمة' : 'Service deleted');
      refetchPending();
      refetchStats();
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ في الحذف' : 'Delete failed');
    }
  };

  const handleClearCache = () => {
    clearOperationCache();
    toast.success(isRTL ? 'تم مسح ذاكرة التخزين المؤقت' : 'Cache cleared');
  };

  // Provider verification with protection against double-clicks
  const handleApproveProvider = useCallback(async (userId: string) => {
    if (isActionInProgress(`provider-${userId}`)) return;
    
    setActionState(`provider-${userId}`, true);
    try {
      await adminService.approveProvider(userId);
      toast.success(isRTL ? 'تم قبول مقدم الخدمة بنجاح' : 'Provider approved');
      refetchProviders();
      refetchUsers();
    } catch (error) {
      console.error('Error approving provider:', error);
      toast.error(isRTL ? 'حدث خطأ في قبول مقدم الخدمة' : 'Failed to approve');
    } finally {
      setActionState(`provider-${userId}`, false);
    }
  }, [isActionInProgress, setActionState, refetchProviders, refetchUsers, isRTL]);

  const handleRejectProvider = useCallback(async (userId: string, reason: string) => {
    if (isActionInProgress(`provider-${userId}`)) return;
    
    setActionState(`provider-${userId}`, true);
    try {
      await adminService.rejectProvider(userId, reason);
      toast.success(isRTL ? 'تم رفض مقدم الخدمة' : 'Provider rejected');
      refetchProviders();
      refetchUsers();
    } catch (error) {
      console.error('Error rejecting provider:', error);
      toast.error(isRTL ? 'حدث خطأ في رفض مقدم الخدمة' : 'Failed to reject');
    } finally {
      setActionState(`provider-${userId}`, false);
    }
  }, [isActionInProgress, setActionState, refetchProviders, refetchUsers, isRTL]);

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
      <main className={`flex-1 container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{isRTL ? 'إدارة ومراقبة شاملة لمنصة Hiwaya' : 'Comprehensive management and monitoring of Hiwaya platform'}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className="inline-flex w-max min-w-full h-auto flex-wrap gap-2 p-2 bg-muted rounded-lg">
              <TabsTrigger value="reviews" className="whitespace-nowrap">{isRTL ? 'المراجعات' : 'Reviews'}</TabsTrigger>
              <TabsTrigger value="provider-verification" className="whitespace-nowrap">{isRTL ? 'تحقق مقدمي الخدمات' : 'Provider Verification'}</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="suspended" className="whitespace-nowrap">{isRTL ? 'المعلقون' : 'Suspended'}</TabsTrigger>
              <TabsTrigger value="event-categories" className="whitespace-nowrap">{isRTL ? 'تصنيفات الفعاليات' : 'Event Categories'}</TabsTrigger>
              <TabsTrigger value="service-categories" className="whitespace-nowrap">{isRTL ? 'تصنيفات الخدمات' : 'Service Categories'}</TabsTrigger>
              <TabsTrigger value="groups-management" className="whitespace-nowrap">{isRTL ? 'إدارة المجموعات' : 'Group Management'}</TabsTrigger>
              <TabsTrigger value="tickets" className="whitespace-nowrap">{isRTL ? 'التذاكر' : 'Tickets'}</TabsTrigger>
              <TabsTrigger value="entity-reports" className="whitespace-nowrap">{isRTL ? 'بلاغات المحتوى' : 'Content Reports'}</TabsTrigger>
              <TabsTrigger value="activity" className="whitespace-nowrap">{isRTL ? 'سجل النشاطات' : 'Activity Logs'}</TabsTrigger>
            </TabsList>
          </div>

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

          {/* Provider Verification Tab */}
          <TabsContent value="provider-verification">
            <ProviderVerificationTab
              providers={pendingProviders}
              onApprove={handleApproveProvider}
              onReject={handleRejectProvider}
              loading={providersLoading}
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

          {/* Groups Management Tab */}
          <TabsContent value="groups-management">
            <GroupManagementTab />
          </TabsContent>

          {/* Unified Tickets Tab */}
          <TabsContent value="tickets">
            <UnifiedTicketsTab />
          </TabsContent>

          {/* Entity Reports Tab */}
          <TabsContent value="entity-reports">
            <EntityReportsTab />
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
        userName={userToSuspend?.full_name || (isRTL ? 'المستخدم' : 'User')}
      />

      <Enhanced360UserDialog
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
