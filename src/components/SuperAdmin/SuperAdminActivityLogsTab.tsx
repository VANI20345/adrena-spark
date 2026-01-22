import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Search, 
  Download, 
  Shield, 
  User,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export const SuperAdminActivityLogsTab = () => {
  const { isRTL } = useLanguageContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Fetch Super Admin logs
  const { data: superAdminLogs = [], isLoading: loadingSuperAdmin } = useSupabaseQuery({
    queryKey: ['super-admin-activity-logs'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('super_admin_activity_logs')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get super admin profiles
      const superAdminIds = [...new Set(logs?.map(l => l.super_admin_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', superAdminIds);

      return logs?.map(log => ({
        ...log,
        admin_name: profiles?.find(p => p.user_id === log.super_admin_id)?.full_name || 'Unknown',
      })) || [];
    },
  });

  // Fetch Admin logs
  const { data: adminLogs = [], isLoading: loadingAdmin } = useSupabaseQuery({
    queryKey: ['admin-activity-logs-all'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get admin profiles
      const adminIds = [...new Set(logs?.map(l => l.admin_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', adminIds);

      return logs?.map(log => ({
        ...log,
        admin_name: profiles?.find(p => p.user_id === log.admin_id)?.full_name || 'Unknown',
      })) || [];
    },
  });

  const getActionBadge = (action: string) => {
    if (action.includes('approve')) return <Badge className="bg-green-600">{action.replace(/_/g, ' ')}</Badge>;
    if (action.includes('reject') || action.includes('delete')) return <Badge className="bg-red-600">{action.replace(/_/g, ' ')}</Badge>;
    if (action.includes('assign') || action.includes('role')) return <Badge className="bg-purple-600">{action.replace(/_/g, ' ')}</Badge>;
    return <Badge variant="secondary">{action.replace(/_/g, ' ')}</Badge>;
  };

  const filterLogs = (logs: any[]) => {
    return logs.filter(log => {
      const matchesSearch = 
        log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action?.includes(actionFilter);
      return matchesSearch && matchesAction;
    });
  };

  const exportLogs = (logs: any[], type: string) => {
    const csvContent = [
      ['Admin', 'Action', 'Entity Type', 'Entity ID', 'Date', 'Details'].join(','),
      ...logs.map(log => [
        log.admin_name,
        log.action,
        log.entity_type,
        log.entity_id || '',
        new Date(log.created_at).toISOString(),
        JSON.stringify(log.details || {})
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const renderLogsTable = (logs: any[], isSuperAdmin: boolean) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={isRTL ? 'text-right' : 'text-left'}>
              {isSuperAdmin ? (isRTL ? 'المشرف الأعلى' : 'Super Admin') : (isRTL ? 'المشرف' : 'Admin')}
            </TableHead>
            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الإجراء' : 'Action'}</TableHead>
            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'نوع الكيان' : 'Entity Type'}</TableHead>
            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التفاصيل' : 'Details'}</TableHead>
            <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filterLogs(logs).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {isRTL ? 'لا توجد سجلات' : 'No logs found'}
              </TableCell>
            </TableRow>
          ) : (
            filterLogs(logs).map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isSuperAdmin ? (
                      <Shield className="h-4 w-4 text-purple-600" />
                    ) : (
                      <User className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="font-medium">{log.admin_name}</span>
                  </div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.entity_type}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  {log.details && typeof log.details === 'object' ? (
                    <div className="text-xs text-muted-foreground truncate">
                      {Object.entries(log.details).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {String(value)}
                        </span>
                      )).slice(0, 2)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isRTL ? 'سجل النشاطات' : 'Activity Logs'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'تتبع جميع إجراءات المشرفين والمشرفين الأعلى' : 'Track all admin and super admin actions'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={isRTL ? 'البحث في السجلات...' : 'Search logs...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={isRTL ? 'تصفية حسب الإجراء' : 'Filter by action'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الإجراءات' : 'All Actions'}</SelectItem>
                <SelectItem value="approve">{isRTL ? 'موافقة' : 'Approve'}</SelectItem>
                <SelectItem value="reject">{isRTL ? 'رفض' : 'Reject'}</SelectItem>
                <SelectItem value="role">{isRTL ? 'صلاحيات' : 'Roles'}</SelectItem>
                <SelectItem value="suspend">{isRTL ? 'تعليق' : 'Suspend'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for Super Admin vs Admin logs */}
          <Tabs defaultValue="super-admin">
            <TabsList>
              <TabsTrigger value="super-admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {isRTL ? 'سجل المشرفين الأعلى' : 'Super Admin Logs'}
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {isRTL ? 'سجل المشرفين' : 'Admin Logs'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="super-admin" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportLogs(superAdminLogs, 'super-admin')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isRTL ? 'تصدير' : 'Export'}
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

            <TabsContent value="admin" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportLogs(adminLogs, 'admin')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isRTL ? 'تصدير' : 'Export'}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
