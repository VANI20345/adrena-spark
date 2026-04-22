import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Search, 
  Download, 
  Shield, 
  User,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  UserCog,
  Ban,
  Calendar,
  Briefcase,
  Users,
  Settings,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// Action translations mapping
const actionTranslations: Record<string, { ar: string; en: string }> = {
  // Event actions
  'approve_event': { ar: 'الموافقة على فعالية', en: 'Approve Event' },
  'reject_event': { ar: 'رفض فعالية', en: 'Reject Event' },
  'delete_event': { ar: 'حذف فعالية', en: 'Delete Event' },
  'feature_event': { ar: 'تمييز فعالية', en: 'Feature Event' },
  'unfeature_event': { ar: 'إلغاء تمييز فعالية', en: 'Unfeature Event' },
  
  // Service actions
  'approve_service': { ar: 'الموافقة على خدمة', en: 'Approve Service' },
  'reject_service': { ar: 'رفض خدمة', en: 'Reject Service' },
  'delete_service': { ar: 'حذف خدمة', en: 'Delete Service' },
  
  // Provider actions
  'approve_provider': { ar: 'الموافقة على مقدم خدمة', en: 'Approve Provider' },
  'reject_provider': { ar: 'رفض مقدم خدمة', en: 'Reject Provider' },
  'verify_provider': { ar: 'توثيق مقدم خدمة', en: 'Verify Provider' },
  
  // User actions
  'suspend_user': { ar: 'تعليق حساب مستخدم', en: 'Suspend User' },
  'unsuspend_user': { ar: 'إلغاء تعليق مستخدم', en: 'Unsuspend User' },
  'delete_user': { ar: 'حذف مستخدم', en: 'Delete User' },
  'warn_user': { ar: 'تحذير مستخدم', en: 'Warn User' },
  
  // Role actions
  'update_user_role': { ar: 'تحديث صلاحيات المستخدم', en: 'Update User Role' },
  'role_update': { ar: 'تغيير الصلاحية', en: 'Role Update' },
  'assign_role': { ar: 'تعيين صلاحية', en: 'Assign Role' },
  'revoke_role': { ar: 'سحب صلاحية', en: 'Revoke Role' },
  
  // Group actions
  'approve_group': { ar: 'الموافقة على مجموعة', en: 'Approve Group' },
  'reject_group': { ar: 'رفض مجموعة', en: 'Reject Group' },
  'delete_group': { ar: 'حذف مجموعة', en: 'Delete Group' },
  'assign_group': { ar: 'تعيين مجموعة', en: 'Assign Group' },
  
  // System actions
  'database_backup': { ar: 'نسخ احتياطي للبيانات', en: 'Database Backup' },
  'update_settings': { ar: 'تحديث الإعدادات', en: 'Update Settings' },
  'update_commission': { ar: 'تحديث العمولة', en: 'Update Commission' },
  'create_category': { ar: 'إنشاء تصنيف', en: 'Create Category' },
  'update_category': { ar: 'تحديث تصنيف', en: 'Update Category' },
  'delete_category': { ar: 'حذف تصنيف', en: 'Delete Category' },
  
  // Ticket actions
  'resolve_ticket': { ar: 'حل تذكرة دعم', en: 'Resolve Ticket' },
  'close_ticket': { ar: 'إغلاق تذكرة', en: 'Close Ticket' },
  'respond_ticket': { ar: 'الرد على تذكرة', en: 'Respond to Ticket' },
  
  // Report actions
  'handle_report': { ar: 'معالجة بلاغ', en: 'Handle Report' },
  'dismiss_report': { ar: 'رفض بلاغ', en: 'Dismiss Report' },
};

// Entity type translations
const entityTranslations: Record<string, { ar: string; en: string }> = {
  'event': { ar: 'فعالية', en: 'Event' },
  'service': { ar: 'خدمة', en: 'Service' },
  'user': { ar: 'مستخدم', en: 'User' },
  'provider': { ar: 'مقدم خدمة', en: 'Provider' },
  'group': { ar: 'مجموعة', en: 'Group' },
  'category': { ar: 'تصنيف', en: 'Category' },
  'ticket': { ar: 'تذكرة', en: 'Ticket' },
  'report': { ar: 'بلاغ', en: 'Report' },
  'system': { ar: 'النظام', en: 'System' },
  'settings': { ar: 'إعدادات', en: 'Settings' },
  'booking': { ar: 'حجز', en: 'Booking' },
};

// Role translations
const roleTranslations: Record<string, { ar: string; en: string }> = {
  'attendee': { ar: 'حضور', en: 'Attendee' },
  'provider': { ar: 'مقدم خدمة', en: 'Provider' },
  'organizer': { ar: 'منظم', en: 'Organizer' },
  'admin': { ar: 'مشرف', en: 'Admin' },
  'super_admin': { ar: 'مشرف أعلى', en: 'Super Admin' },
};

// Details key translations
const detailKeyTranslations: Record<string, { ar: string; en: string }> = {
  'user_name': { ar: 'اسم المستخدم', en: 'User Name' },
  'user_email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'event_title': { ar: 'عنوان الفعالية', en: 'Event Title' },
  'service_name': { ar: 'اسم الخدمة', en: 'Service Name' },
  'reason': { ar: 'السبب', en: 'Reason' },
  'new_role': { ar: 'الصلاحية الجديدة', en: 'New Role' },
  'newRole': { ar: 'الصلاحية الجديدة', en: 'New Role' },
  'old_role': { ar: 'الصلاحية السابقة', en: 'Previous Role' },
  'oldRole': { ar: 'الصلاحية السابقة', en: 'Previous Role' },
  'duration': { ar: 'المدة', en: 'Duration' },
  'provider_name': { ar: 'اسم مقدم الخدمة', en: 'Provider Name' },
  'group_name': { ar: 'اسم المجموعة', en: 'Group Name' },
  'category_name': { ar: 'اسم التصنيف', en: 'Category Name' },
  'status': { ar: 'الحالة', en: 'Status' },
  'amount': { ar: 'المبلغ', en: 'Amount' },
};

export const SuperAdminActivityLogsTab = () => {
  const { isRTL, language } = useLanguageContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const translations = {
    ar: {
      title: 'سجل النشاطات الإدارية',
      description: 'عرض وتتبع جميع الإجراءات التي يقوم بها المشرفون والمشرفون الأعلى في النظام',
      searchPlaceholder: 'البحث في السجلات...',
      filterByAction: 'تصفية حسب نوع الإجراء',
      allActions: 'جميع الإجراءات',
      approve: 'الموافقات',
      reject: 'الرفض',
      roles: 'الصلاحيات',
      suspend: 'التعليق',
      superAdminLogs: 'سجل المشرفين الأعلى',
      adminLogs: 'سجل المشرفين',
      superAdmin: 'اسم المشرف الأعلى',
      admin: 'اسم المشرف',
      action: 'نوع الإجراء',
      entityType: 'نوع العنصر',
      details: 'تفاصيل الإجراء',
      dateTime: 'التاريخ والوقت',
      noLogs: 'لا توجد سجلات حالياً',
      export: 'تصدير السجلات',
      refresh: 'تحديث',
      realDataNote: 'يتم عرض البيانات الفعلية من سجل النظام بشكل مباشر',
      noLogsDesc: 'ستظهر هنا جميع الإجراءات الإدارية عند تنفيذها',
      unknownAdmin: 'مشرف غير معروف',
      performedBy: 'بواسطة',
    },
    en: {
      title: 'Administrative Activity Logs',
      description: 'View and track all actions performed by admins and super admins in the system',
      searchPlaceholder: 'Search logs...',
      filterByAction: 'Filter by action type',
      allActions: 'All Actions',
      approve: 'Approvals',
      reject: 'Rejections',
      roles: 'Role Changes',
      suspend: 'Suspensions',
      superAdminLogs: 'Super Admin Logs',
      adminLogs: 'Admin Logs',
      superAdmin: 'Super Admin Name',
      admin: 'Admin Name',
      action: 'Action Type',
      entityType: 'Entity Type',
      details: 'Action Details',
      dateTime: 'Date & Time',
      noLogs: 'No logs found',
      export: 'Export Logs',
      refresh: 'Refresh',
      realDataNote: 'Displaying real-time data from the system logs',
      noLogsDesc: 'All administrative actions will appear here when performed',
      unknownAdmin: 'Unknown Admin',
      performedBy: 'By',
    },
  };

  const t = translations[language];

  // Fetch Super Admin logs
  const { data: superAdminLogs = [], isLoading: loadingSuperAdmin, refetch: refetchSuperAdmin } = useSupabaseQuery({
    queryKey: ['super-admin-activity-logs-real'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('super_admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const superAdminIds = [...new Set(logs?.map(l => l.super_admin_id) || [])];
      let profiles: any[] = [];
      if (superAdminIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', superAdminIds);
        profiles = profilesData || [];
      }

      return logs?.map(log => ({
        ...log,
        admin_name: profiles.find(p => p.user_id === log.super_admin_id)?.full_name || t.unknownAdmin,
      })) || [];
    },
  });

  // Fetch Admin logs
  const { data: adminLogs = [], isLoading: loadingAdmin, refetch: refetchAdmin } = useSupabaseQuery({
    queryKey: ['admin-activity-logs-all-real'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const adminIds = [...new Set(logs?.map(l => l.admin_id) || [])];
      let profiles: any[] = [];
      if (adminIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', adminIds);
        profiles = profilesData || [];
      }

      return logs?.map(log => ({
        ...log,
        admin_name: profiles.find(p => p.user_id === log.admin_id)?.full_name || t.unknownAdmin,
      })) || [];
    },
  });

  // Get translated action name
  const getActionName = (action: string): string => {
    const key = action?.toLowerCase();
    if (actionTranslations[key]) {
      return actionTranslations[key][language];
    }
    // Fallback: format action string nicely
    return action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || (language === 'ar' ? 'إجراء غير محدد' : 'Unknown Action');
  };

  // Get translated entity type
  const getEntityTypeName = (entityType: string): string => {
    const key = entityType?.toLowerCase();
    if (entityTranslations[key]) {
      return entityTranslations[key][language];
    }
    return entityType || (language === 'ar' ? 'غير محدد' : 'Unknown');
  };

  // Get translated role name
  const getRoleName = (role: string): string => {
    const key = role?.toLowerCase();
    if (roleTranslations[key]) {
      return roleTranslations[key][language];
    }
    return role || '';
  };

  // Get action icon based on action type
  const getActionIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || '';
    if (actionLower.includes('approve')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (actionLower.includes('reject') || actionLower.includes('delete')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (actionLower.includes('role') || actionLower.includes('assign')) return <UserCog className="h-4 w-4 text-purple-600" />;
    if (actionLower.includes('suspend')) return <Ban className="h-4 w-4 text-orange-600" />;
    if (actionLower.includes('event')) return <Calendar className="h-4 w-4 text-blue-600" />;
    if (actionLower.includes('service')) return <Briefcase className="h-4 w-4 text-cyan-600" />;
    if (actionLower.includes('group')) return <Users className="h-4 w-4 text-indigo-600" />;
    if (actionLower.includes('setting') || actionLower.includes('config')) return <Settings className="h-4 w-4 text-gray-600" />;
    if (actionLower.includes('backup') || actionLower.includes('database')) return <Database className="h-4 w-4 text-emerald-600" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  // Get action badge with proper styling
  const getActionBadge = (action: string) => {
    const actionLower = action?.toLowerCase() || '';
    const actionName = getActionName(action);
    
    if (actionLower.includes('approve') || actionLower.includes('verify')) {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">{actionName}</Badge>;
    }
    if (actionLower.includes('reject') || actionLower.includes('delete') || actionLower.includes('dismiss')) {
      return <Badge className="bg-red-600 hover:bg-red-700 text-white">{actionName}</Badge>;
    }
    if (actionLower.includes('role') || actionLower.includes('assign')) {
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">{actionName}</Badge>;
    }
    if (actionLower.includes('suspend') || actionLower.includes('warn')) {
      return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">{actionName}</Badge>;
    }
    if (actionLower.includes('unsuspend')) {
      return <Badge className="bg-teal-600 hover:bg-teal-700 text-white">{actionName}</Badge>;
    }
    if (actionLower.includes('backup') || actionLower.includes('update')) {
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{actionName}</Badge>;
    }
    return <Badge variant="secondary">{actionName}</Badge>;
  };

  // Format details object into readable text
  const formatDetails = (details: any): React.ReactNode => {
    if (!details || typeof details !== 'object') {
      return <span className="text-muted-foreground">—</span>;
    }

    const entries = Object.entries(details);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    return (
      <div className={`space-y-1 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
        {entries.slice(0, 3).map(([key, value]) => {
          const keyTranslation = detailKeyTranslations[key];
          const displayKey = keyTranslation ? keyTranslation[language] : key.replace(/_/g, ' ');
          
          // Special handling for role values
          let displayValue = String(value);
          if (key.toLowerCase().includes('role')) {
            displayValue = getRoleName(displayValue) || displayValue;
          }
          
          return (
            <div key={key} className="flex items-center gap-1 flex-wrap">
              <span className="font-medium text-foreground">{displayKey}:</span>
              <span className="text-muted-foreground">{displayValue}</span>
            </div>
          );
        })}
        {entries.length > 3 && (
          <span className="text-xs text-muted-foreground">
            {language === 'ar' ? `+${entries.length - 3} تفاصيل إضافية` : `+${entries.length - 3} more`}
          </span>
        )}
      </div>
    );
  };

  const filterLogs = (logs: any[]) => {
    return logs.filter(log => {
      const matchesSearch = 
        log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getActionName(log.action).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action?.toLowerCase().includes(actionFilter);
      return matchesSearch && matchesAction;
    });
  };

  const exportLogs = (logs: any[], type: string) => {
    const headers = language === 'ar' 
      ? ['المشرف', 'الإجراء', 'نوع العنصر', 'معرف العنصر', 'التاريخ', 'التفاصيل']
      : ['Admin', 'Action', 'Entity Type', 'Entity ID', 'Date', 'Details'];
    
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.admin_name,
        getActionName(log.action),
        getEntityTypeName(log.entity_type),
        log.entity_id || '',
        new Date(log.created_at).toISOString(),
        JSON.stringify(log.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleRefresh = () => {
    refetchSuperAdmin();
    refetchAdmin();
  };

  const renderLogsTable = (logs: any[], isSuperAdmin: boolean) => (
    <div className="rounded-md border overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-bold`}>
              {isSuperAdmin ? t.superAdmin : t.admin}
            </TableHead>
            <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.action}</TableHead>
            <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.entityType}</TableHead>
            <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-bold`}>{t.details}</TableHead>
            <TableHead className={`${isRTL ? 'text-left' : 'text-right'} font-bold`}>{t.dateTime}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filterLogs(logs).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-muted-foreground">{t.noLogs}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.noLogsDesc}</p>
              </TableCell>
            </TableRow>
          ) : (
            filterLogs(logs).map((log) => (
              <TableRow key={log.id}>
                <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    {isSuperAdmin ? (
                      <Shield className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    ) : (
                      <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="font-medium">{log.admin_name}</span>
                  </div>
                </TableCell>
                <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    {getActionIcon(log.action)}
                    {getActionBadge(log.action)}
                  </div>
                </TableCell>
                <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                  <Badge variant="outline" className="font-normal">
                    {getEntityTypeName(log.entity_type)}
                  </Badge>
                </TableCell>
                <TableCell className={`max-w-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatDetails(log.details)}
                </TableCell>
                <TableCell className={`text-muted-foreground whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                  {format(new Date(log.created_at), 'PPp', { locale: language === 'ar' ? ar : enUS })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-3 text-xl ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <FileText className="h-6 w-6 text-primary" />
                {t.title}
              </CardTitle>
              <CardDescription className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.description}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <RefreshCw className="h-4 w-4" />
              {t.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info Alert */}
          <Alert className={`mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                {t.realDataNote}
              </AlertDescription>
            </div>
          </Alert>

          {/* Filters */}
          <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className={`w-full sm:w-56 ${isRTL ? 'text-right' : ''}`}>
                <SelectValue placeholder={t.filterByAction} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allActions}</SelectItem>
                <SelectItem value="approve">{t.approve}</SelectItem>
                <SelectItem value="reject">{t.reject}</SelectItem>
                <SelectItem value="role">{t.roles}</SelectItem>
                <SelectItem value="suspend">{t.suspend}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for Super Admin vs Admin logs */}
          <Tabs defaultValue="admin" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className={`mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TabsTrigger 
                value="admin" 
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <User className="h-4 w-4" />
                {t.adminLogs}
                {adminLogs.length > 0 && (
                  <Badge variant="secondary" className="mr-1 ml-1">
                    {adminLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="super-admin" 
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Shield className="h-4 w-4" />
                {t.superAdminLogs}
                {superAdminLogs.length > 0 && (
                  <Badge variant="secondary" className="mr-1 ml-1">
                    {superAdminLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="mt-4">
              <div className={`flex mb-4 ${isRTL ? 'justify-end' : 'justify-end'}`}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportLogs(adminLogs, 'admin')}
                  className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="h-4 w-4" />
                  {t.export}
                </Button>
              </div>
              {loadingAdmin ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                renderLogsTable(adminLogs, false)
              )}
            </TabsContent>

            <TabsContent value="super-admin" className="mt-4">
              <div className={`flex mb-4 ${isRTL ? 'justify-end' : 'justify-end'}`}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportLogs(superAdminLogs, 'super-admin')}
                  className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="h-4 w-4" />
                  {t.export}
                </Button>
              </div>
              {loadingSuperAdmin ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                renderLogsTable(superAdminLogs, true)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
