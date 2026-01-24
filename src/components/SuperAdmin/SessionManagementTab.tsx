import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Search, Users, Shield, Briefcase, User, Loader2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserWithRole {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_activity: string | null;
  role: string;
}

export const SessionManagementTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [terminatingUser, setTerminatingUser] = useState<string | null>(null);

  const { data: users, isLoading, refetch } = useOptimizedQuery(
    ['session-management-users'],
    async () => {
      // Get all users with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, last_activity')
        .order('last_activity', { ascending: false, nullsFirst: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles?.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || 'attendee',
      })) as UserWithRole[];
    }
  );

  const translations = {
    ar: {
      title: 'إدارة الجلسات',
      description: 'إنهاء جلسات المستخدمين النشطة عبر جميع الأجهزة',
      searchPlaceholder: 'البحث عن مستخدم...',
      user: 'المستخدم',
      role: 'الدور',
      lastActivity: 'آخر نشاط',
      actions: 'الإجراءات',
      terminateSession: 'إنهاء الجلسة',
      confirmTerminate: 'تأكيد إنهاء الجلسة',
      terminateWarning: 'سيتم تسجيل خروج هذا المستخدم من جميع أجهزته فوراً. هل أنت متأكد؟',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
      successTerminate: 'تم إنهاء جلسة المستخدم بنجاح',
      error: 'حدث خطأ',
      admin: 'مشرف',
      provider: 'مزود خدمة',
      attendee: 'حاضر',
      super_admin: 'مشرف أعلى',
      noUsers: 'لا يوجد مستخدمين',
      activeNow: 'نشط الآن',
      recentlyActive: 'نشط مؤخراً',
      inactive: 'غير نشط',
      terminateAll: 'إنهاء جميع الجلسات',
      terminateAllWarning: 'سيتم تسجيل خروج جميع المستخدمين من أجهزتهم. هذا الإجراء لا يمكن التراجع عنه.',
    },
    en: {
      title: 'Session Management',
      description: 'Terminate active user sessions across all devices',
      searchPlaceholder: 'Search for a user...',
      user: 'User',
      role: 'Role',
      lastActivity: 'Last Activity',
      actions: 'Actions',
      terminateSession: 'Terminate Session',
      confirmTerminate: 'Confirm Session Termination',
      terminateWarning: 'This user will be logged out from all devices immediately. Are you sure?',
      confirm: 'Confirm',
      cancel: 'Cancel',
      successTerminate: 'User session terminated successfully',
      error: 'An error occurred',
      admin: 'Admin',
      provider: 'Provider',
      attendee: 'Attendee',
      super_admin: 'Super Admin',
      noUsers: 'No users found',
      activeNow: 'Active Now',
      recentlyActive: 'Recently Active',
      inactive: 'Inactive',
      terminateAll: 'Terminate All Sessions',
      terminateAllWarning: 'All users will be logged out from their devices. This action cannot be undone.',
    },
  };

  const t = translations[language];

  const roleLabels: Record<string, string> = {
    admin: t.admin,
    provider: t.provider,
    attendee: t.attendee,
    super_admin: t.super_admin,
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return <Shield className="h-4 w-4" />;
      case 'provider':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'provider':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { label: t.inactive, color: 'text-muted-foreground' };
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffMinutes = (now.getTime() - activity.getTime()) / (1000 * 60);

    if (diffMinutes < 5) return { label: t.activeNow, color: 'text-green-600' };
    if (diffMinutes < 60) return { label: t.recentlyActive, color: 'text-yellow-600' };
    return { label: t.inactive, color: 'text-muted-foreground' };
  };

  const handleTerminateSession = async (userId: string) => {
    setTerminatingUser(userId);
    try {
      // Call admin API to terminate session
      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'terminate_session', userId },
      });

      if (error) throw error;

      toast.success(t.successTerminate);
      refetch();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error(t.error);
    } finally {
      setTerminatingUser(null);
    }
  };

  const filteredUsers = users?.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LogOut className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                <p className="text-3xl font-bold">{users?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.admin}</p>
                <p className="text-3xl font-bold text-blue-600">
                  {users?.filter(u => u.role === 'admin' || u.role === 'super_admin').length || 0}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.provider}</p>
                <p className="text-3xl font-bold text-green-600">
                  {users?.filter(u => u.role === 'provider').length || 0}
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.attendee}</p>
                <p className="text-3xl font-bold text-purple-600">
                  {users?.filter(u => u.role === 'attendee').length || 0}
                </p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.user}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.lastActivity}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const activityStatus = getActivityStatus(user.last_activity);
                return (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                          <AvatarFallback>{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || (language === 'ar' ? 'غير محدد' : 'Unknown')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                        {getRoleIcon(user.role)}
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={activityStatus.color}>
                        {user.last_activity
                          ? new Date(user.last_activity).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
                          : t.inactive}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={terminatingUser === user.user_id}
                          >
                            {terminatingUser === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <LogOut className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {t.terminateSession}
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              {t.confirmTerminate}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.terminateWarning}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleTerminateSession(user.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t.confirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t.noUsers}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManagementTab;
