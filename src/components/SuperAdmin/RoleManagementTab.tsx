import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
}

export const RoleManagementTab = () => {
  const { isRTL, language } = useLanguageContext();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersWithRoles = [], isLoading, error, refetch } = useSupabaseQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      try {
        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, created_at');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Get all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
          throw rolesError;
        }

        // Map roles to users
        const usersMap = new Map<string, UserWithRole>();
        (profiles || []).forEach(p => {
          usersMap.set(p.user_id, { 
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            created_at: p.created_at,
            role: 'attendee' 
          });
        });
        (roles || []).forEach(r => {
          if (usersMap.has(r.user_id)) {
            const existingUser = usersMap.get(r.user_id)!;
            usersMap.set(r.user_id, { ...existingUser, role: r.role });
          }
        });

        return Array.from(usersMap.values());
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
  });

  const filteredUsers = (usersWithRoles || []).filter(u => {
    if (!u) return false;
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || isSubmitting) return;

    // SECURITY: Prevent Admin from modifying Super Admin
    if (selectedUser.role === 'super_admin') {
      toast.error(isRTL ? 'لا يمكن تعديل صلاحيات المشرف الأعلى' : 'Cannot modify Super Admin permissions');
      return;
    }

    // SECURITY: Only Super Admin can assign Super Admin role
    if (newRole === 'super_admin' && user?.id) {
      const { data: currentUserRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (currentUserRole?.role !== 'super_admin') {
        toast.error(isRTL ? 'غير مصرح لك بهذا الإجراء' : 'You are not authorized for this action');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      let updateError;
      if (existingRole) {
        const result = await supabase
          .from('user_roles')
          .update({ role: newRole as any, updated_at: new Date().toISOString() })
          .eq('user_id', selectedUser.user_id);
        updateError = result.error;
      } else {
        const result = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole as any });
        updateError = result.error;
      }

      if (updateError) throw updateError;

      // Log activity
      if (user?.id) {
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
      }

      toast.success(isRTL ? 'تم تحديث الصلاحية بنجاح' : 'Role updated successfully');
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setNewRole('');
      refetch();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(isRTL ? 'حدث خطأ في تحديث الصلاحية' : 'Error updating role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeRole = async (userId: string, userName: string | null, currentRole: string) => {
    // SECURITY: Prevent revoking Super Admin role
    if (currentRole === 'super_admin') {
      toast.error(isRTL ? 'لا يمكن إلغاء صلاحيات المشرف الأعلى' : 'Cannot revoke Super Admin permissions');
      return;
    }

    if (!confirm(isRTL ? 'هل أنت متأكد من إلغاء صلاحية هذا المستخدم؟' : 'Are you sure you want to revoke this user\'s role?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'attendee' as any })
        .eq('user_id', userId);

      if (error) throw error;

      // Log activity
      if (user?.id) {
        await supabase.from('admin_activity_logs').insert({
          admin_id: user.id,
          action: 'revoke_role',
          entity_type: 'user_role',
          entity_id: userId,
          details: { user_name: userName, previous_role: currentRole }
        });
      }

      toast.success(isRTL ? 'تم إلغاء الصلاحية بنجاح' : 'Role revoked successfully');
      refetch();
    } catch (err) {
      console.error('Error revoking role:', err);
      toast.error(isRTL ? 'حدث خطأ في إلغاء الصلاحية' : 'Error revoking role');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className={`bg-purple-600 hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Crown className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'مشرف أعلى' : 'Super Admin'}
          </Badge>
        );
      case 'admin':
        return (
          <Badge className={`bg-blue-600 hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ShieldCheck className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'مشرف' : 'Admin'}
          </Badge>
        );
      case 'provider':
        return (
          <Badge className={`bg-green-600 hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <User className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'مقدم خدمة' : 'Provider'}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className={isRTL ? 'flex-row-reverse' : ''}>
            <User className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {isRTL ? 'مستخدم' : 'Attendee'}
          </Badge>
        );
    }
  };

  const isTargetSuperAdmin = selectedUser?.role === 'super_admin';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'حدث خطأ' : 'An Error Occurred'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لم نتمكن من تحميل بيانات المستخدمين' : 'Unable to load user data'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
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
                {isRTL ? 'إدارة الصلاحيات' : 'Role Management'}
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL ? 'تعيين وإدارة صلاحيات المستخدمين' : 'Assign and manage user roles'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Security Notice */}
          <Alert className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            <AlertDescription className={`text-purple-800 dark:text-purple-300 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL 
                ? 'ملاحظة أمنية: لا يمكن للمشرفين تعديل صلاحيات المشرف الأعلى'
                : 'Security Note: Admins cannot modify Super Admin permissions'}
            </AlertDescription>
          </Alert>

          {/* Filters */}
          <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={isRTL ? 'البحث بالاسم...' : 'Search by name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={`w-full sm:w-48 ${isRTL ? 'text-right' : ''}`}>
                <SelectValue placeholder={isRTL ? 'تصفية حسب الصلاحية' : 'Filter by role'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الصلاحيات' : 'All Roles'}</SelectItem>
                <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                <SelectItem value="provider">{isRTL ? 'مقدم خدمة' : 'Provider'}</SelectItem>
                <SelectItem value="attendee">{isRTL ? 'مستخدم' : 'Attendee'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الصلاحية الحالية' : 'Current Role'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'تاريخ الانضمام' : 'Joined Date'}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name || ''} className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">{u.full_name || (isRTL ? 'مستخدم مجهول' : 'Unknown User')}</span>
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
                            disabled={u.role === 'super_admin'}
                            onClick={() => {
                              if (u.role === 'super_admin') {
                                toast.error(isRTL ? 'لا يمكن تعديل صلاحيات المشرف الأعلى' : 'Cannot modify Super Admin');
                                return;
                              }
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          {u.role === 'admin' && (
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
            <DialogTitle>{isRTL ? 'تعيين صلاحية' : 'Assign Role'}</DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL 
                ? `تعيين صلاحية جديدة لـ ${selectedUser?.full_name || 'المستخدم'}`
                : `Assign a new role to ${selectedUser?.full_name || 'User'}`
              }
            </DialogDescription>
          </DialogHeader>

          {isTargetSuperAdmin && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL ? 'لا يمكن تعديل صلاحيات المشرف الأعلى' : 'Cannot modify Super Admin permissions'}
              </AlertDescription>
            </Alert>
          )}

          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole} disabled={isTargetSuperAdmin}>
              <SelectTrigger className={isRTL ? 'text-right' : ''}>
                <SelectValue placeholder={isRTL ? 'اختر الصلاحية' : 'Select role'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendee">{isRTL ? 'مستخدم' : 'Attendee'}</SelectItem>
                <SelectItem value="provider">{isRTL ? 'مقدم خدمة' : 'Provider'}</SelectItem>
                <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className={isRTL ? 'flex-row-reverse gap-2' : 'gap-2'}>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleRoleChange} 
              disabled={isTargetSuperAdmin || isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                isRTL ? 'تأكيد' : 'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};