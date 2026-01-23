import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { UserCheck, AlertTriangle, UserX } from 'lucide-react';
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
  const { language, isRTL } = useLanguageContext();

  const loadSuspendedUsers = async () => {
    try {
      setLoading(true);
      const users = await adminService.getSuspendedUsers();
      setSuspendedUsers(users as SuspendedUser[]);
    } catch (error) {
      console.error('Error loading suspended users:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في تحميل المستخدمين المعلقين' : 'Failed to load suspended users',
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
        title: language === 'ar' ? 'تم رفع التعليق' : 'Suspension Lifted',
        description: language === 'ar' ? 'تم رفع التعليق عن المستخدم بنجاح' : 'User suspension has been lifted successfully'
      });
      loadSuspendedUsers();
      setUnsuspendingUserId(null);
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في رفع التعليق' : 'Failed to lift suspension',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className={`${isRTL ? 'mr-2' : 'ml-2'}`}>
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (suspendedUsers.length === 0) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            {language === 'ar' ? 'المستخدمون المعلقون' : 'Suspended Users'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{language === 'ar' ? 'لا يوجد مستخدمين معلقين حالياً' : 'No suspended users at the moment'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          {language === 'ar' ? 'المستخدمون المعلقون' : 'Suspended Users'}
          <Badge variant="secondary" className={isRTL ? 'mr-auto' : 'ml-auto'}>
            {suspendedUsers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'السبب' : 'Reason'}
                </TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'تم التعليق بواسطة' : 'Suspended By'}
                </TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'تاريخ التعليق' : 'Suspension Date'}
                </TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'ينتهي في' : 'Expires On'}
                </TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </TableHead>
                <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suspendedUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.full_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={user.suspension_reason}>
                      {user.suspension_reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.suspended_by_name || (language === 'ar' ? 'غير معروف' : 'Unknown')}
                  </TableCell>
                  <TableCell>
                    {user.suspended_at 
                      ? format(new Date(user.suspended_at), 'PPP', { locale: language === 'ar' ? ar : enUS })
                      : (language === 'ar' ? 'غير محدد' : 'Not specified')}
                  </TableCell>
                  <TableCell>
                    {user.suspended_until 
                      ? format(new Date(user.suspended_until), 'PPP', { locale: language === 'ar' ? ar : enUS })
                      : <Badge variant="destructive">{language === 'ar' ? 'دائم' : 'Permanent'}</Badge>}
                  </TableCell>
                  <TableCell>
                    {user.suspension_status === 'permanent' && (
                      <Badge variant="destructive">{language === 'ar' ? 'دائم' : 'Permanent'}</Badge>
                    )}
                    {user.suspension_status === 'active' && (
                      <Badge variant="outline" className="border-orange-500 text-orange-500">
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </Badge>
                    )}
                    {user.suspension_status === 'expired' && (
                      <Badge variant="secondary">{language === 'ar' ? 'منتهي' : 'Expired'}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUnsuspendingUserId(user.user_id)}
                      >
                        <UserCheck className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {language === 'ar' ? 'رفع التعليق' : 'Lift Suspension'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={!!unsuspendingUserId} onOpenChange={() => setUnsuspendingUserId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد رفع التعليق' : 'Confirm Lift Suspension'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من رفع التعليق عن هذا المستخدم؟ سيتمكن من الوصول إلى النظام مباشرة.'
                : 'Are you sure you want to lift the suspension on this user? They will be able to access the system immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => unsuspendingUserId && handleUnsuspend(unsuspendingUserId)}>
              {language === 'ar' ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
