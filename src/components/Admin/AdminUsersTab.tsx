import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Eye, Edit, Ban, Crown, Trash2, Shield, Users } from 'lucide-react';
import { format } from 'date-fns';

interface AdminUsersTabProps {
  users: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterRole: string;
  onFilterRoleChange: (value: string) => void;
  filterStatus: 'all' | 'active' | 'suspended';
  onFilterStatusChange: (value: 'all' | 'active' | 'suspended') => void;
  onViewDetails: (user: any) => void;
  onEditUser: (user: any) => void;
  onSuspendUser: (userId: string, suspended: boolean, user: any, e?: React.MouseEvent) => void;
  onDeleteUser: (userId: string) => void;
  loading: boolean;
  totalUsersCount?: number;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  searchTerm,
  onSearchChange,
  filterRole,
  onFilterRoleChange,
  filterStatus,
  onFilterStatusChange,
  onViewDetails,
  onEditUser,
  onSuspendUser,
  onDeleteUser,
  loading,
  totalUsersCount
}) => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.display_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
                       user.user_roles?.some((r: any) => r.role === filterRole);
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'suspended' && user.suspended) ||
                         (filterStatus === 'active' && !user.suspended);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Use provided totalUsersCount or fall back to users array length
  const displayTotalUsers = totalUsersCount ?? users.length;

  if (loading) {
    return (
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Total Count */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="h-5 w-5" />
                {t('admin.users')}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? `إجمالي ${displayTotalUsers} مستخدم (يظهر ${filteredUsers.length})`
                  : `Total ${displayTotalUsers} users (showing ${filteredUsers.length})`}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {displayTotalUsers}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <Input
              placeholder={language === 'ar' ? 'بحث بالاسم أو البريد' : 'Search by name or email'}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <Select value={filterRole} onValueChange={onFilterRoleChange}>
              <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.filters.allRoles')}</SelectItem>
                <SelectItem value="attendee">{t('admin.filters.attendee')}</SelectItem>
                <SelectItem value="provider">{t('admin.filters.provider')}</SelectItem>
                <SelectItem value="admin">{t('admin.filters.admin')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => onFilterStatusChange(v as any)}>
              <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.filters.allStatus')}</SelectItem>
                <SelectItem value="active">{t('admin.filters.active')}</SelectItem>
                <SelectItem value="suspended">{t('admin.filters.suspended')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.displayId')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.name')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.email')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.role')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.status')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.registeredAt')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.fields.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className={`font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                        {user.display_id || 'N/A'}
                      </TableCell>
                      <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {user.full_name || t('admin.fields.noName')}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{user.email}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          {user.user_roles?.map((r: any) => (
                            <Badge key={r.role} variant="outline" className={`${isRTL ? 'flex-row-reverse' : ''}`}>
                              {r.role === 'admin' && <Crown className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />}
                              {language === 'ar' ? (
                                r.role === 'admin' ? 'آدمن' :
                                r.role === 'super_admin' ? 'مشرف أعلى' :
                                r.role === 'provider' ? 'مقدم خدمة' :
                                'مشارك'
                              ) : r.role}
                            </Badge>
                          )) || <Badge variant="outline">-</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {user.suspended ? (
                          <Badge variant="destructive">
                            {language === 'ar' ? 'معلق' : 'Suspended'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            {language === 'ar' ? 'نشط' : 'Active'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                        {format(new Date(user.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDetails(user)}
                            title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditUser(user)}
                            title={language === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={user.suspended ? 'text-success' : 'text-brand-orange'}
                            onClick={(e) => onSuspendUser(user.user_id, user.suspended, user, e)}
                            title={user.suspended 
                              ? (language === 'ar' ? 'إلغاء التعليق' : 'Unsuspend') 
                              : (language === 'ar' ? 'تعليق' : 'Suspend')}
                          >
                            {user.suspended ? <Shield className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteUser(user.user_id)}
                            title={language === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
};