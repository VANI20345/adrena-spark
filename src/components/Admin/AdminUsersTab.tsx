import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Eye, Edit, Ban, BanIcon, Crown, Trash2, Shield } from 'lucide-react';
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
  loading
}) => {
  const { t, language } = useLanguageContext();

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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.users')}</CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? `إجمالي ${filteredUsers.length} مستخدم`
              : `Total ${filteredUsers.length} users`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder={language === 'ar' ? 'بحث بالاسم أو البريد' : 'Search by name or email'}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <Select value={filterRole} onValueChange={onFilterRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.filters.allRoles')}</SelectItem>
                <SelectItem value="attendee">{t('admin.filters.attendee')}</SelectItem>
                <SelectItem value="organizer">{t('admin.filters.organizer')}</SelectItem>
                <SelectItem value="provider">{t('admin.filters.provider')}</SelectItem>
                <SelectItem value="admin">{t('admin.filters.admin')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => onFilterStatusChange(v as any)}>
              <SelectTrigger>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.fields.displayId')}</TableHead>
                  <TableHead>{t('admin.fields.name')}</TableHead>
                  <TableHead>{t('admin.fields.email')}</TableHead>
                  <TableHead>{t('admin.fields.role')}</TableHead>
                  <TableHead>{t('admin.fields.status')}</TableHead>
                  <TableHead>{t('admin.fields.registeredAt')}</TableHead>
                  <TableHead className="text-right">{t('admin.fields.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-mono text-xs">
                      {user.display_id || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.full_name || t('admin.fields.noName')}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.user_roles?.map((r: any) => (
                        <Badge key={r.role} variant="outline" className="mr-1">
                          {r.role === 'admin' && <Crown className="h-3 w-3 mr-1 inline" />}
                          {language === 'ar' ? (
                            r.role === 'admin' ? 'مدير' :
                            r.role === 'organizer' ? 'منظم' :
                            r.role === 'provider' ? 'مزود' :
                            'مشارك'
                          ) : r.role}
                        </Badge>
                      )) || <Badge variant="outline">-</Badge>}
                    </TableCell>
                    <TableCell>
                      {user.suspended ? (
                        <Badge variant="destructive">
                          {language === 'ar' ? 'معلق' : 'Suspended'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {language === 'ar' ? 'نشط' : 'Active'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={user.suspended ? 'text-green-600' : 'text-orange-600'}
                          onClick={(e) => onSuspendUser(user.user_id, user.suspended, user, e)}
                        >
                          {user.suspended ? <Shield className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-red-100"
                          onClick={() => onDeleteUser(user.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
