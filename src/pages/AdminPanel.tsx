import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { RegionalGroupsTab } from '@/components/Admin/RegionalGroupsTab';
import { GroupManagementTab } from '@/components/Admin/GroupManagementTab';
import { adminService } from '@/services/adminService';
import { activityLogService } from '@/services/activityLogService';
import { 
  Users, Calendar, FileText, DollarSign, CheckCircle, XCircle, Eye, Edit, Trash2,
  Shield, Settings, Database, Activity, TrendingUp, RefreshCw, Download, User, Bell,
  AlertTriangle, Crown, BarChart3, AlertCircle
} from 'lucide-react';

const AdminPanel = () => {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<any>({
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
  });
  
  const [loading, setLoading] = useState(true);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [financialReports, setFinancialReports] = useState<any[]>([]);
  const [stuckPayments, setStuckPayments] = useState<any[]>([]);
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

  useEffect(() => {
    if (userRole === 'admin') {
      loadAllData();
    }
  }, [userRole]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadPendingItems(),
        loadUsers(),
        loadCategories(),
        loadFinancialData(),
        loadSystemData()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await adminService.getOverviewStats();
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingItems = async () => {
    try {
      const [eventsData, servicesData] = await Promise.all([
        supabase.from('events').select('*').eq('status', 'pending'),
        supabase.from('services').select('*').eq('status', 'pending')
      ]);
      setPendingEvents(eventsData.data || []);
      setPendingServices(servicesData.data || []);
    } catch (error) {
      console.error('Error loading pending items:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await adminService.getAllUsers();
      setUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name_ar');
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      const [reports, payments] = await Promise.all([
        adminService.getFinancialReports(),
        adminService.getStuckPayments()
      ]);
      setFinancialReports(reports);
      setStuckPayments(payments);
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const loadSystemData = async () => {
    try {
      const [logs, settings] = await Promise.all([
        adminService.getSystemLogs(),
        adminService.getSystemSettings()
      ]);
      setSystemLogs(logs);
      setMaintenanceMode(settings.maintenance_mode?.enabled || false);
    } catch (error) {
      console.error('Error loading system data:', error);
    }
  };

  // Event/Service Actions with Notifications and Activity Logging
  const handleEventAction = async (eventId: string, action: 'approve' | 'reject', comment?: string) => {
    const status = action === 'approve' ? 'approved' : 'cancelled';
    try {
      const event = pendingEvents.find(e => e.id === eventId);
      await supabase.from('events').update({ status }).eq('id', eventId);
      
      // Log activity
      await activityLogService.logActivity(
        action === 'approve' ? 'approve_event' : 'reject_event',
        'event',
        eventId,
        { event_title: event?.title_ar, comment }
      );
      
      // Send notification to organizer
      if (event?.organizer_id) {
        await adminService.sendNotification({
          userIds: [event.organizer_id],
          title: action === 'approve' ? 'تم قبول الفعالية' : 'تم رفض الفعالية',
          message: action === 'approve' 
            ? `تم قبول فعالية "${event.title_ar}" ونشرها على المنصة`
            : `تم رفض فعالية "${event.title_ar}". ${comment ? `السبب: ${comment}` : 'يرجى مراجعة التفاصيل والمحاولة مرة أخرى'}`,
          type: action === 'approve' ? 'approval' : 'rejection'
        });
      }
      
      toast.success(`تم ${action === 'approve' ? 'قبول' : 'رفض'} الفعالية`);
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
      loadStats();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleServiceAction = async (serviceId: string, action: 'approve' | 'reject', comment?: string) => {
    const status = action === 'approve' ? 'approved' : 'cancelled';
    try {
      const service = pendingServices.find(s => s.id === serviceId);
      await supabase.from('services').update({ status }).eq('id', serviceId);
      
      // Log activity
      await activityLogService.logActivity(
        action === 'approve' ? 'approve_service' : 'reject_service',
        'service',
        serviceId,
        { service_name: service?.name_ar, comment }
      );
      
      // Send notification to provider
      if (service?.provider_id) {
        await adminService.sendNotification({
          userIds: [service.provider_id],
          title: action === 'approve' ? 'تم قبول الخدمة' : 'تم رفض الخدمة',
          message: action === 'approve' 
            ? `تم قبول خدمة "${service.name_ar}" ونشرها على المنصة`
            : `تم رفض خدمة "${service.name_ar}". ${comment ? `السبب: ${comment}` : 'يرجى مراجعة التفاصيل والمحاولة مرة أخرى'}`,
          type: action === 'approve' ? 'approval' : 'rejection'
        });
      }
      
      toast.success(`تم ${action === 'approve' ? 'قبول' : 'رفض'} الخدمة`);
      setPendingServices(prev => prev.filter(s => s.id !== serviceId));
      loadStats();
    } catch (error) {
      toast.error('حدث خطأ');
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
    // Prevent default behavior and stop event propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleUserSuspend called:', { userId, suspended, user });
    
    if (suspended) {
      // Unsuspend
      if (!confirm(`هل تريد إلغاء تعليق هذا المستخدم؟`)) return;
      try {
        await adminService.unsuspendUser(userId);
        
        // Log activity
        await activityLogService.logActivity(
          'unsuspend_user',
          'user',
          userId,
          { action: 'unsuspend' }
        );
        
        toast.success('تم إلغاء تعليق المستخدم بنجاح');
        loadAllData();
      } catch (error) {
        console.error('Error unsuspending user:', error);
        toast.error('فشل في إلغاء تعليق المستخدم');
      }
    } else {
      // Open suspension dialog
      console.log('Opening suspension dialog for user:', user);
      setUserToSuspend(user);
      setSuspensionDialogOpen(true);
      console.log('Suspension dialog state set to true');
    }
  };


  const handleConfirmSuspension = async (reason: string, durationDays?: number) => {
    if (!userToSuspend) return;
    
    console.log('Confirming suspension:', { reason, durationDays, user: userToSuspend });
    
    try {
      await adminService.suspendUser(userToSuspend.user_id, reason, durationDays);
      
      // Log activity
      await activityLogService.logActivity(
        'suspend_user',
        'user',
        userToSuspend.user_id,
        { 
          action: 'suspend',
          reason,
          duration_days: durationDays,
          suspended_until: durationDays 
            ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        }
      );
      
      setSuspensionDialogOpen(false);
      setUserToSuspend(null);
      
      // Reload users to show the updated suspension status
      await loadUsers();
      
      toast.success('تم تعليق المستخدم بنجاح');
      console.log('User suspended successfully, UI refreshed');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('فشل في تعليق المستخدم');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع البيانات المرتبطة به.')) return;
    try {
      await adminService.deleteUser(userId);
      
      // Log activity
      await activityLogService.logActivity(
        'delete_user',
        'user',
        userId,
        { action: 'delete' }
      );
      
      toast.success('تم حذف المستخدم');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
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
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
      loadStats();
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleServiceDelete = async (serviceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      await supabase.from('services').delete().eq('id', serviceId);
      toast.success('تم حذف الخدمة');
      setPendingServices(prev => prev.filter(s => s.id !== serviceId));
      loadStats();
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  const handleRestartSystem = async () => {
    if (!confirm('هل أنت متأكد من إعادة تشغيل النظام؟ قد يستغرق هذا بضع دقائق.')) return;
    try {
      toast.info('جاري إعادة تشغيل النظام...');
      // In production, this would trigger a server restart
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.reload();
    } catch (error) {
      toast.error('حدث خطأ في إعادة التشغيل');
    }
  };

  // User Management
  const handleUserRoleChange = async (userId: string, newRole: 'attendee' | 'organizer' | 'provider' | 'admin') => {
    try {
      await adminService.updateUserRole(userId, newRole);
      
      // Log activity
      await activityLogService.logActivity(
        'change_user_role',
        'user',
        userId,
        { new_role: newRole }
      );
      
      toast.success('تم تحديث دور المستخدم');
      // Update local state immediately
      setUsers(prev => prev.map(u => 
        u.user_id === userId 
          ? { ...u, user_roles: [{ role: newRole }] }
          : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('حدث خطأ في تحديث الدور');
    }
  };

  // Category Management
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
      await adminService.deleteCategory(categoryId);
      toast.success('تم حذف الفئة');
      loadCategories();
    } catch (error) {
      toast.error('حدث خطأ في الحذف');
    }
  };

  // Financial Actions
  const handleExportFinancialReport = () => {
    const csvContent = [
      ['الشهر', 'المبلغ'],
      ...financialReports.map(r => [r.month, r.amount])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial-report-${new Date().toISOString()}.csv`;
    link.click();
    toast.success('تم تصدير التقرير');
  };

  const handleRetryPayment = async (paymentId: string) => {
    try {
      await adminService.retryPayment(paymentId);
      toast.success('جاري إعادة محاولة الدفع');
      loadFinancialData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  // System Actions
  const handleClearLogs = async () => {
    if (!confirm('هل تريد حذف سجلات الأخطاء القديمة (أكثر من 7 أيام)؟')) return;
    try {
      await adminService.clearSystemLogs();
      toast.success('تم تنظيف السجلات');
      loadSystemData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode;
      await adminService.updateSystemSetting('maintenance_mode', { enabled: newValue, message: 'الموقع تحت الصيانة حالياً' });
      setMaintenanceMode(newValue);
      toast.success(newValue ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
      
      // Force reload to apply maintenance mode
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
      
      // Log activity
      await activityLogService.logActivity(
        'database_backup',
        'system',
        'backup',
        data
      );
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error('حدث خطأ في إنشاء النسخة الاحتياطية: ' + error.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.user_roles?.[0]?.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'suspended' && user.suspended) ||
                         (filterStatus === 'active' && !user.suspended);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة التحكم الإدارية</h1>
          <p className="text-muted-foreground">إدارة ومراقبة شاملة لمنصة أدرينا</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full h-auto flex-wrap gap-2 p-2 bg-muted rounded-lg">
              <TabsTrigger value="overview" className="whitespace-nowrap">نظرة عامة</TabsTrigger>
              <TabsTrigger value="reviews" className="whitespace-nowrap">المراجعات</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">المستخدمون</TabsTrigger>
              <TabsTrigger value="suspended" className="whitespace-nowrap">المعلقون</TabsTrigger>
              <TabsTrigger value="content" className="whitespace-nowrap">المحتوى</TabsTrigger>
              <TabsTrigger value="service-categories" className="whitespace-nowrap">تصنيفات الخدمات</TabsTrigger>
              <TabsTrigger value="regional-groups" className="whitespace-nowrap">مجموعات إقليمية</TabsTrigger>
              <TabsTrigger value="groups-management" className="whitespace-nowrap">إدارة المجموعات</TabsTrigger>
              <TabsTrigger value="finance" className="whitespace-nowrap">المالية</TabsTrigger>
              <TabsTrigger value="system" className="whitespace-nowrap">النظام</TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">الإشعارات</TabsTrigger>
              <TabsTrigger value="activity" className="whitespace-nowrap">سجل النشاطات</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">{stats.userGrowth} من الشهر الماضي</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الفعاليات</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">{stats.eventGrowth} من الشهر الماضي</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalServices}</div>
                  <p className="text-xs text-muted-foreground">خدمة نشطة</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} ر.س</div>
                  <p className="text-xs text-muted-foreground">{stats.revenueGrowth} من الشهر الماضي</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">الفئات</span>
                    <span className="font-semibold">{stats.totalCategories}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">الحجوزات النشطة</span>
                    <span className="font-semibold">{stats.activeBookings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">بانتظار المراجعة</span>
                    <Badge variant="outline">{stats.pendingReviews}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    حالة النظام
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">قاعدة البيانات</span>
                    <Badge variant="default">متصلة</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">وضع الصيانة</span>
                    <Badge variant={maintenanceMode ? "destructive" : "default"}>
                      {maintenanceMode ? "مفعل" : "معطل"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">عدد السجلات</span>
                    <span className="font-semibold">{systemLogs.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <BulkOperations 
              items={pendingEvents} 
              type="events" 
              onRefresh={loadPendingItems} 
            />
            
            <BulkOperations 
              items={pendingServices} 
              type="services" 
              onRefresh={loadPendingItems} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الفعاليات المعلقة ({pendingEvents.length})</CardTitle>
                  <CardDescription>فعاليات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingEvents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">لا توجد فعاليات معلقة</p>
                    ) : (
                      pendingEvents.map((event: any) => (
                        <div key={event.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{event.title_ar}</h4>
                            <Badge variant="outline">معلق</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {event.description_ar?.substring(0, 100)}...
                          </p>
                          {event.requires_license && (
                            <Alert className="mb-3">
                              <Shield className="h-4 w-4" />
                              <AlertDescription>يتطلب ترخيص</AlertDescription>
                            </Alert>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEventView(event)}>
                              <Eye className="w-4 h-4 ml-1" />
                              عرض
                            </Button>
                            <Button size="sm" onClick={() => handleEventAction(event.id, 'approve')}>
                              <CheckCircle className="w-4 h-4 ml-1" />
                              قبول
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleEventDecline(event)}>
                              <XCircle className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الخدمات المعلقة ({pendingServices.length})</CardTitle>
                  <CardDescription>خدمات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingServices.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">لا توجد خدمات معلقة</p>
                    ) : (
                      pendingServices.map((service: any) => (
                        <div key={service.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{service.name_ar}</h4>
                            <Badge variant="outline">معلق</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description_ar?.substring(0, 100)}...
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleServiceView(service)}>
                              <Eye className="w-4 h-4 ml-1" />
                              عرض
                            </Button>
                            <Button size="sm" onClick={() => handleServiceAction(service.id, 'approve')}>
                              <CheckCircle className="w-4 h-4 ml-1" />
                              قبول
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleServiceDecline(service)}>
                              <XCircle className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  إدارة المستخدمين
                </CardTitle>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input 
                    placeholder="البحث عن مستخدم..."
                    className="max-w-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="فلترة حسب الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأدوار</SelectItem>
                      <SelectItem value="attendee">حاضر</SelectItem>
                      <SelectItem value="organizer">منظم</SelectItem>
                      <SelectItem value="provider">مقدم خدمة</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="فلترة حسب الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="suspended">معلق</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => adminService.exportUsers()}>
                    <Download className="w-4 h-4 ml-2" />
                    تصدير القائمة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>النقاط</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 20).map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'غير محدد'}</p>
                              {user.suspended && (
                                <Badge variant="destructive" className="text-xs">معلق</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.user_roles?.[0]?.role || 'غير محدد'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.points_balance || 0}</TableCell>
                        <TableCell>{user.user_wallets?.[0]?.balance || 0} ر.س</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              عرض
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 ml-1" />
                              تعديل
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Crown className="w-4 h-4 ml-1" />
                                  الدور
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>تغيير دور المستخدم</DialogTitle>
                                  <DialogDescription>
                                    اختر الدور الجديد للمستخدم {user.full_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Select onValueChange={(value) => handleUserRoleChange(user.user_id, value as any)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="اختر الدور الجديد" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="attendee">حاضر</SelectItem>
                                      <SelectItem value="organizer">منظم</SelectItem>
                                      <SelectItem value="provider">مقدم خدمة</SelectItem>
                                      <SelectItem value="admin">مدير</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              type="button"
                              size="sm" 
                              variant={user.suspended ? "default" : "outline"}
                              onClick={(e) => handleUserSuspend(user.user_id, user.suspended, user, e)}
                            >
                              <AlertTriangle className="w-4 h-4 ml-1" />
                              {user.suspended ? 'إلغاء' : 'تعليق'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleUserDelete(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suspended Users Tab */}
          <TabsContent value="suspended" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  المستخدمون المعلقون
                </CardTitle>
                <CardDescription>
                  قائمة بجميع المستخدمين الذين تم تعليق حساباتهم
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SuspendedUsersTab />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Categories Tab */}
          <TabsContent value="service-categories" className="space-y-6">
            <ServiceCategoriesTab />
          </TabsContent>

          {/* Regional Groups Tab */}
          <TabsContent value="regional-groups" className="space-y-6">
            <RegionalGroupsTab />
          </TabsContent>


          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>إدارة الفئات</CardTitle>
                    <CardDescription>إضافة وتحرير فئات الفعاليات والخدمات</CardDescription>
                  </div>
                  <CategoryDialog onSuccess={loadCategories} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category: any) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{category.name_ar}</h4>
                          <p className="text-sm text-muted-foreground">{category.name}</p>
                        </div>
                        <Badge variant="secondary">{category.event_count || 0}</Badge>
                      </div>
                      {category.description_ar && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {category.description_ar.substring(0, 80)}...
                        </p>
                      )}
                      <div className="flex gap-2">
                        <CategoryDialog category={category} onSuccess={loadCategories} />
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>التقارير المالية الشهرية</CardTitle>
                    <Button size="sm" onClick={handleExportFinancialReport}>
                      <Download className="w-4 h-4 ml-2" />
                      تصدير
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialReports.slice(0, 6).map((report: any, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <span className="font-medium">{report.month}</span>
                        <span className="text-green-600 font-bold">
                          {Number(report.amount).toLocaleString()} ر.س
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المدفوعات المعلقة</CardTitle>
                  <CardDescription>معالجة الدفعات التي لم تكتمل</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stuckPayments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">لا توجد مدفوعات معلقة</p>
                    ) : (
                      stuckPayments.map((payment: any) => (
                        <div key={payment.id} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{payment.amount} ر.س</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                            <Badge variant="destructive">معلق</Badge>
                          </div>
                          <Button size="sm" onClick={() => handleRetryPayment(payment.id)}>
                            <RefreshCw className="w-4 h-4 ml-1" />
                            إعادة المحاولة
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  إحصائيات مفصلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold">{stats.activeBookings}</p>
                    <p className="text-sm text-muted-foreground">الحجوزات المؤكدة</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold text-red-600">{stuckPayments.length}</p>
                    <p className="text-sm text-muted-foreground">دفعات معلقة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>سجل النظام</CardTitle>
                  <CardDescription>آخر {systemLogs.length} حدث</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {systemLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
                    ) : (
                      systemLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border rounded">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-500' :
                            log.level === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('ar-SA')}
                            </p>
                          </div>
                          <Badge variant={log.level === 'ERROR' || log.level === 'CRITICAL' ? 'destructive' : 'secondary'}>
                            {log.level}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>أدوات النظام</CardTitle>
                  <CardDescription>إدارة وصيانة النظام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base font-medium">وضع الصيانة</Label>
                      <p className="text-sm text-muted-foreground">
                        منع جميع المستخدمين من الوصول للموقع عدا المدراء
                      </p>
                    </div>
                    <Button
                      variant={maintenanceMode ? "destructive" : "outline"}
                      onClick={handleMaintenanceMode}
                    >
                      <Settings className="w-4 h-4 ml-2" />
                      {maintenanceMode ? "إيقاف الصيانة" : "تفعيل الصيانة"}
                    </Button>
                  </div>

                  {maintenanceMode && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        وضع الصيانة مفعل حالياً. المستخدمون العاديون لا يمكنهم الوصول للموقع.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button className="w-full" variant="outline" onClick={handleRestartSystem}>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    إعادة تشغيل النظام
                  </Button>

                  <Button className="w-full" variant="outline" onClick={handleClearLogs}>
                    <AlertTriangle className="w-4 h-4 ml-2" />
                    تنظيف سجل الأخطاء
                  </Button>

                  <Button className="w-full" onClick={handleDatabaseBackup}>
                    <Database className="w-4 h-4 ml-2" />
                    إنشاء نسخة احتياطية
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      سيتم حفظ النسخة الاحتياطية في مجلد documents/backups
                    </AlertDescription>
                  </Alert>
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
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{Math.round(stats.totalUsers * 0.7)}</p>
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

          {/* Groups Management Tab */}
          <TabsContent value="groups-management">
            <GroupManagementTab />
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
        onSuccess={loadUsers}
      />
      
      <Footer />
    </div>
  );
};

export default AdminPanel;
