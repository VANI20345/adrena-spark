import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useTotalUsersCount } from '@/hooks/useTotalUsersCount';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  UserPlus, 
  UserMinus,
  Crown,
  User,
  AlertTriangle,
  AlertCircle,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  role: string;
}

export const RoleManagementTab = () => {
  const { isRTL, language } = useLanguageContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use shared hook for consistent total users count
  const { data: sharedTotalUsers = 0 } = useTotalUsersCount();

  const translations = {
    ar: {
      title: 'إدارة الصلاحيات',
      description: 'تعيين وإدارة صلاحيات المستخدمين',
      searchPlaceholder: 'البحث بالاسم، البريد، الهاتف...',
      user: 'المستخدم',
      contact: 'معلومات التواصل',
      currentRole: 'الصلاحية الحالية',
      joined: 'تاريخ الانضمام',
      actions: 'الإجراءات',
      allRoles: 'جميع الصلاحيات',
      superAdmin: 'مشرف أعلى',
      admin: 'مشرف',
      provider: 'مقدم خدمة',
      attendee: 'مستخدم',
      noUsers: 'لا يوجد مستخدمين',
      assignRole: 'تعيين صلاحية',
      assignRoleDesc: 'تعيين صلاحية جديدة لـ',
      securityNote: 'ملاحظة أمنية: لا يمكن للمشرفين تعديل صلاحيات المشرف الأعلى',
      cannotModify: 'لا يمكن تعديل صلاحيات المشرف الأعلى',
      selectRole: 'اختر الصلاحية',
      cancel: 'إلغاء',
      save: 'حفظ',
      successUpdate: 'تم تحديث الصلاحية بنجاح',
      errorUpdate: 'حدث خطأ في تحديث الصلاحية',
      errorLoad: 'لم نتمكن من تحميل بيانات المستخدمين',
      retry: 'إعادة المحاولة',
      error: 'حدث خطأ',
      revokeSuccess: 'تم إلغاء الصلاحية بنجاح',
      confirmRevoke: 'هل أنت متأكد من إلغاء صلاحية هذا المستخدم؟',
      unknownUser: 'مستخدم مجهول',
      totalUsers: 'إجمالي المستخدمين',
      filterByRole: 'تصفية حسب الصلاحية',
    },
    en: {
      title: 'Role Management',
      description: 'Assign and manage user roles',
      searchPlaceholder: 'Search by name, email, phone...',
      user: 'User',
      contact: 'Contact Info',
      currentRole: 'Current Role',
      joined: 'Joined Date',
      actions: 'Actions',
      allRoles: 'All Roles',
      superAdmin: 'Super Admin',
      admin: 'Admin',
      provider: 'Provider',
      attendee: 'Attendee',
      noUsers: 'No users found',
      assignRole: 'Assign Role',
      assignRoleDesc: 'Assign a new role to',
      securityNote: 'Security Note: Admins cannot modify Super Admin permissions',
      cannotModify: 'Cannot modify Super Admin',
      selectRole: 'Select Role',
      cancel: 'Cancel',
      save: 'Save',
      successUpdate: 'Role updated successfully',
      errorUpdate: 'Error updating role',
      errorLoad: 'Unable to load user data',
      retry: 'Retry',
      error: 'An Error Occurred',
      revokeSuccess: 'Role revoked successfully',
      confirmRevoke: 'Are you sure you want to revoke this user\'s role?',
      unknownUser: 'Unknown User',
      totalUsers: 'Total Users',
      filterByRole: 'Filter by role',
    },
  };

  const t = translations[language];

  const { data: usersWithRoles = [], isLoading, error, refetch } = useSupabaseQuery({
    queryKey: ['users-with-roles-complete'],
    queryFn: async (): Promise<UserWithRole[]> => {
      try {
        // Use admin-users edge function for full user data (includes email)
        const { data: edgeFnData, error: edgeFnError } = await supabase.functions.invoke('admin-users', {
          method: 'GET'
        });

        // Get all roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

        // Get phone numbers from profile_contacts
        const { data: contacts } = await supabase
          .from('profile_contacts')
          .select('user_id, phone, email');

        const contactMap = new Map(contacts?.map(c => [c.user_id, { phone: c.phone, email: c.email }]) || []);

        if (!edgeFnError && edgeFnData?.users) {
          // Use edge function data (has email from auth.users)
          return edgeFnData.users.map((u: any) => ({
            user_id: u.id || u.user_id,
            full_name: u.full_name || u.user_metadata?.full_name || null,
            avatar_url: u.avatar_url || u.user_metadata?.avatar_url || null,
            phone: contactMap.get(u.id || u.user_id)?.phone || u.phone || null,
            email: contactMap.get(u.id || u.user_id)?.email || u.email || null,
            created_at: u.created_at,
            role: roleMap.get(u.id || u.user_id) || 'attendee',
          }));
        }

        // Fallback: use profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, created_at')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;
        if (!profiles || profiles.length === 0) return [];

        return profiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          phone: contactMap.get(p.user_id)?.phone || null,
          email: contactMap.get(p.user_id)?.email || null,
          created_at: p.created_at,
          role: roleMap.get(p.user_id) || 'attendee',
        }));
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
  });

  // Filter users based on search and role
  const filteredUsers = (usersWithRoles || []).filter(u => {
    if (!u) return false;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.phone?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.user_id.toLowerCase().includes(searchLower);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || isSubmitting) return;

    // SECURITY: Prevent demoting another super_admin via the assign dialog
    if (selectedUser.role === 'super_admin' && newRole !== 'super_admin') {
      toast.error(language === 'ar' 
        ? 'لا يمكن تخفيض رتبة مشرف أعلى آخر' 
        : 'Cannot demote another Super Admin');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Use edge function for role updates to bypass RLS safely
      const { error: updateError } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId: selectedUser.user_id, role: newRole },
      });

      if (updateError) throw updateError;

      // Log activity
      if (user?.id) {
        try {
          await supabase.from('admin_activity_logs').insert({
            admin_id: user.id,
            action: 'assign_role',
            entity_type: 'user_role',
            entity_id: selectedUser.user_id,
            details: {
              user_name: selectedUser.full_name,
              previous_role: selectedUser.role,
              new_role: newRole,
            }
          });
        } catch (logErr) {
          console.error('Failed to log activity:', logErr);
        }
      }

      toast.success(t.successUpdate);
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setNewRole('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['total-users-count-shared'] });
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(t.errorUpdate);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeRole = async (userId: string, userName: string | null, currentRole: string) => {
    // SECURITY: Prevent revoking Super Admin role
    if (currentRole === 'super_admin') {
      toast.error(t.cannotModify);
      return;
    }

    if (!confirm(t.confirmRevoke)) return;

    try {
      // Use edge function for role updates to bypass RLS safely
      const { error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId, role: 'attendee' },
      });

      if (error) throw error;

      // Log activity
      if (user?.id) {
        try {
          await supabase.from('admin_activity_logs').insert({
            admin_id: user.id,
            action: 'revoke_role',
            entity_type: 'user_role',
            entity_id: userId,
            details: { user_name: userName, previous_role: currentRole }
          });
        } catch (logErr) {
          console.error('Failed to log activity:', logErr);
        }
      }

      toast.success(t.revokeSuccess);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['total-users-count-shared'] });
    } catch (err) {
      console.error('Error revoking role:', err);
      toast.error(t.errorUpdate);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className={`bg-purple-600 hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Crown className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t.superAdmin}
          </Badge>
        );
      case 'admin':
        return (
          <Badge className={`bg-blue-600 hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ShieldCheck className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t.admin}
          </Badge>
        );
      case 'provider':
        return (
          <Badge className={`bg-green-600 hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <User className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t.provider}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className={isRTL ? 'flex-row-reverse' : ''}>
            <User className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {t.attendee}
          </Badge>
        );
    }
  };

  // Variable kept for future use if needed

  if (isLoading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="pt-6">
          <div className={`h-64 flex flex-col items-center justify-center text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t.error}</h3>
            <p className="text-muted-foreground mb-4">{t.errorLoad}</p>
            <Button onClick={() => refetch()} variant="outline">{t.retry}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Shield className="h-5 w-5" />
                {t.title}
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t.description}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {t.totalUsers}: {sharedTotalUsers}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Security Notice */}
          <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            <AlertDescription className={`text-purple-800 dark:text-purple-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.securityNote}
            </AlertDescription>
          </Alert>

          {/* Filters */}
          <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={`w-full sm:w-48 ${isRTL ? 'text-right' : ''}`}>
                <SelectValue placeholder={t.filterByRole} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allRoles}</SelectItem>
                <SelectItem value="super_admin">{t.superAdmin}</SelectItem>
                <SelectItem value="admin">{t.admin}</SelectItem>
                <SelectItem value="provider">{t.provider}</SelectItem>
                <SelectItem value="attendee">{t.attendee}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.user}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.contact}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.currentRole}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.joined}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t.noUsers}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url || ''} alt={u.full_name || ''} />
                            <AvatarFallback>{u.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <span className="font-medium">{u.full_name || t.unknownUser}</span>
                            <p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {u.email && (
                            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          {(u.role === 'admin' || u.role === 'provider') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeRole(u.user_id, u.full_name, u.role)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>{t.assignRole}</DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {t.assignRoleDesc} {selectedUser?.full_name || t.unknownUser}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className={isRTL ? 'text-right' : ''}>
                <SelectValue placeholder={t.selectRole} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendee">{t.attendee}</SelectItem>
                <SelectItem value="provider">{t.provider}</SelectItem>
                <SelectItem value="admin">{t.admin}</SelectItem>
                <SelectItem value="super_admin">{t.superAdmin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className={isRTL ? 'flex-row-reverse gap-2' : 'gap-2'}>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={handleRoleChange} 
              disabled={isSubmitting}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              {isSubmitting && <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};