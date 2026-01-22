import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  User
} from 'lucide-react';

export const RoleManagementTab = () => {
  const { isRTL } = useLanguageContext();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');

  const { data: usersWithRoles = [], isLoading, refetch } = useSupabaseQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Get all users with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersMap = new Map();
      profiles?.forEach(p => {
        usersMap.set(p.user_id, { ...p, role: 'attendee' });
      });
      roles?.forEach(r => {
        if (usersMap.has(r.user_id)) {
          usersMap.set(r.user_id, { ...usersMap.get(r.user_id), role: r.role });
        }
      });

      return Array.from(usersMap.values());
    },
  });

  const filteredUsers = usersWithRoles.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      let error;
      if (existingRole) {
        const result = await supabase
          .from('user_roles')
          .update({ role: newRole as any, updated_at: new Date().toISOString() })
          .eq('user_id', selectedUser.user_id);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: newRole as any });
        error = result.error;
      }

      if (error) throw error;

      // Log the action
      await supabase.from('super_admin_activity_logs').insert({
        super_admin_id: user?.id,
        action: 'assign_role',
        entity_type: 'user_role',
        entity_id: selectedUser.user_id,
        details: {
          user_name: selectedUser.full_name,
          previous_role: selectedUser.role,
          new_role: newRole,
        }
      });

      toast.success(isRTL ? 'تم تحديث الصلاحية بنجاح' : 'Role updated successfully');
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setNewRole('');
      refetch();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(isRTL ? 'حدث خطأ في تحديث الصلاحية' : 'Error updating role');
    }
  };

  const handleRevokeRole = async (userId: string, userName: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من إلغاء صلاحية هذا المستخدم؟' : 'Are you sure you want to revoke this user\'s role?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'attendee' })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('super_admin_activity_logs').insert({
        super_admin_id: user?.id,
        action: 'revoke_role',
        entity_type: 'user_role',
        entity_id: userId,
        details: { user_name: userName }
      });

      toast.success(isRTL ? 'تم إلغاء الصلاحية بنجاح' : 'Role revoked successfully');
      refetch();
    } catch (error) {
      console.error('Error revoking role:', error);
      toast.error(isRTL ? 'حدث خطأ في إلغاء الصلاحية' : 'Error revoking role');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-600 hover:bg-purple-700"><Crown className="h-3 w-3 mr-1" />{isRTL ? 'مشرف أعلى' : 'Super Admin'}</Badge>;
      case 'admin':
        return <Badge className="bg-blue-600 hover:bg-blue-700"><ShieldCheck className="h-3 w-3 mr-1" />{isRTL ? 'مشرف' : 'Admin'}</Badge>;
      case 'provider':
        return <Badge className="bg-green-600 hover:bg-green-700"><User className="h-3 w-3 mr-1" />{isRTL ? 'مقدم خدمة' : 'Provider'}</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />{isRTL ? 'مستخدم' : 'Attendee'}</Badge>;
    }
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {isRTL ? 'إدارة الصلاحيات' : 'Role Management'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'تعيين وإدارة صلاحيات المستخدمين' : 'Assign and manage user roles'}
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
                placeholder={isRTL ? 'البحث بالاسم...' : 'Search by name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
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
                        <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
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
                          {(u.role === 'admin' || u.role === 'super_admin') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeRole(u.user_id, u.full_name)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تعيين صلاحية' : 'Assign Role'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? `تعيين صلاحية جديدة لـ ${selectedUser?.full_name}`
                : `Assign a new role to ${selectedUser?.full_name}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleRoleChange}>
              {isRTL ? 'تأكيد' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
