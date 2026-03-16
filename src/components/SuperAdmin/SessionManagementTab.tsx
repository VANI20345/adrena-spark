import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useTotalUsersCount } from '@/hooks/useTotalUsersCount';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Search, Users, Shield, Briefcase, User, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserWithRole {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  last_activity: string | null;
  role: string;
}

export const SessionManagementTab = () => {
  const { language, isRTL } = useLanguageContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [terminatingUser, setTerminatingUser] = useState<string | null>(null);

  // Use shared hook for consistent total users count across all pages
  const { data: sharedTotalUsers = 0 } = useTotalUsersCount();

  const { data: users, isLoading, refetch } = useSupabaseQuery({
    queryKey: ['session-management-users-all-v2'],
    queryFn: async () => {
      // Get ALL users via admin edge function (most accurate count from auth.users)
      try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
          method: 'GET'
        });
        
        if (error) throw error;
        
        if (data?.users) {
          // Get all roles and phone contacts in parallel
          const userIds = data.users.map((u: any) => u.user_id);
          const [rolesResult, contactsResult] = await Promise.all([
            supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
            supabase.from('profile_contacts').select('user_id, phone').in('user_id', userIds),
          ]);

          const roleMap = new Map(rolesResult.data?.map(r => [r.user_id, r.role]) || []);
          const phoneMap = new Map(contactsResult.data?.map(c => [c.user_id, c.phone]) || []);

          return data.users.map((p: any) => ({
            user_id: p.user_id,
            full_name: p.full_name || '',
            avatar_url: p.avatar_url,
            phone: phoneMap.get(p.user_id) || null,
            last_activity: p.last_activity,
            role: roleMap.get(p.user_id) || 'attendee',
          })) as UserWithRole[];
        }
      } catch (err) {
        console.error('Error fetching users via edge function:', err);
      }

      // Fallback to profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, last_activity')
        .order('last_activity', { ascending: false, nullsFirst: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles) return [];

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        avatar_url: p.avatar_url,
        phone: null,
        last_activity: p.last_activity,
        role: roleMap.get(p.user_id) || 'attendee',
      })) as UserWithRole[];
    }
  });

  const translations = {
    ar: {
      title: 'إدارة الجلسات',
      description: 'إنهاء جلسات المستخدمين النشطة عبر جميع الأجهزة',
      searchPlaceholder: 'البحث بالاسم أو رقم الهاتف...',
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
      totalUsers: 'إجمالي المستخدمين',
      adminsCount: 'المشرفين',
      providersCount: 'مزودي الخدمات',
      attendeesCount: 'المستخدمين',
      refresh: 'تحديث',
    },
    en: {
      title: 'Session Management',
      description: 'Terminate active user sessions across all devices',
      searchPlaceholder: 'Search by name or phone...',
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
      totalUsers: 'Total Users',
      adminsCount: 'Admins',
      providersCount: 'Providers',
      attendeesCount: 'Attendees',
      refresh: 'Refresh',
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
    user.phone?.includes(searchQuery) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate stats - use shared total users count for consistency across pages
  const totalUsers = sharedTotalUsers;
  const adminsCount = users?.filter(u => u.role === 'admin' || u.role === 'super_admin').length || 0;
  const providersCount = users?.filter(u => u.role === 'provider').length || 0;
  const attendeesCount = users?.filter(u => u.role === 'attendee').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LogOut className="h-6 w-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className={isRTL ? 'flex-row-reverse' : ''}>
          <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t.refresh}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.totalUsers}</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.adminsCount}</p>
                <p className="text-3xl font-bold text-blue-600">{adminsCount}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.providersCount}</p>
                <p className="text-3xl font-bold text-green-600">{providersCount}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-muted-foreground">{t.attendeesCount}</p>
                <p className="text-3xl font-bold text-purple-600">{attendeesCount}</p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.user}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.role}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.lastActivity}</TableHead>
                <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const activityStatus = getActivityStatus(user.last_activity);
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                            <AvatarFallback>{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <span className="font-medium">{user.full_name || (language === 'ar' ? 'غير محدد' : 'Unknown')}</span>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className={`flex items-center gap-1 w-fit ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {getRoleIcon(user.role)}
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <span className={activityStatus.color}>{activityStatus.label}</span>
                          {user.last_activity && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(user.last_activity).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={isRTL ? 'flex justify-start' : 'flex justify-end'}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={terminatingUser === user.user_id}
                                className={isRTL ? 'flex-row-reverse' : ''}
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
                              <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                                <AlertDialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  {t.confirmTerminate}
                                </AlertDialogTitle>
                                <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                                  {t.terminateWarning}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className={isRTL ? 'flex-row-reverse gap-2' : 'gap-2'}>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManagementTab;