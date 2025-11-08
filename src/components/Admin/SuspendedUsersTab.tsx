import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SuspendedUser {
  user_id: string;
  full_name: string;
  suspended: boolean;
  suspended_at: string;
  suspended_until: string | null;
  suspension_reason: string;
  suspended_by: string;
  suspended_by_name: string;
  suspension_status: 'permanent' | 'active' | 'expired';
}

export const SuspendedUsersTab = () => {
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsuspendingUserId, setUnsuspendingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSuspendedUsers = async () => {
    try {
      setLoading(true);
      const users = await adminService.getSuspendedUsers();
      setSuspendedUsers(users as SuspendedUser[]);
    } catch (error) {
      console.error('Error loading suspended users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المستخدمين المعلقين',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuspendedUsers();
  }, []);

  const handleUnsuspend = async (userId: string) => {
    try {
      await adminService.unsuspendUser(userId);
      toast({
        title: 'تم رفع التعليق',
        description: 'تم رفع التعليق عن المستخدم بنجاح'
      });
      loadSuspendedUsers();
      setUnsuspendingUserId(null);
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع التعليق',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  if (suspendedUsers.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>لا يوجد مستخدمين معلقين حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">السبب</TableHead>
              <TableHead className="text-right">تم التعليق بواسطة</TableHead>
              <TableHead className="text-right">تاريخ التعليق</TableHead>
              <TableHead className="text-right">ينتهي في</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suspendedUsers.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">{user.full_name || 'غير محدد'}</TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={user.suspension_reason}>
                    {user.suspension_reason}
                  </div>
                </TableCell>
                <TableCell>{user.suspended_by_name || 'غير معروف'}</TableCell>
                <TableCell>
                  {user.suspended_at 
                    ? format(new Date(user.suspended_at), 'PPP', { locale: ar })
                    : 'غير محدد'}
                </TableCell>
                <TableCell>
                  {user.suspended_until 
                    ? format(new Date(user.suspended_until), 'PPP', { locale: ar })
                    : <Badge variant="destructive">دائم</Badge>}
                </TableCell>
                <TableCell>
                  {user.suspension_status === 'permanent' && (
                    <Badge variant="destructive">دائم</Badge>
                  )}
                  {user.suspension_status === 'active' && (
                    <Badge variant="outline" className="border-orange-500 text-orange-500">نشط</Badge>
                  )}
                  {user.suspension_status === 'expired' && (
                    <Badge variant="secondary">منتهي</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnsuspendingUserId(user.user_id)}
                  >
                    <UserCheck className="h-4 w-4 ml-2" />
                    رفع التعليق
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!unsuspendingUserId} onOpenChange={() => setUnsuspendingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد رفع التعليق</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رفع التعليق عن هذا المستخدم؟ سيتمكن من الوصول إلى النظام مباشرة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => unsuspendingUserId && handleUnsuspend(unsuspendingUserId)}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
