import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Mail, MapPin, Phone, Shield, Wallet, Award, Activity, Users, DollarSign } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as adminService from '@/services/adminService';

interface Enhanced360UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export const Enhanced360UserDialog = ({ open, onOpenChange, user }: Enhanced360UserDialogProps) => {
  const { t, language } = useLanguageContext();

  const { data: transactions = [] } = useQuery({
    queryKey: ['user-transactions', user?.user_id],
    queryFn: () => adminService.getUserTransactions(user?.user_id),
    enabled: !!user && open
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['user-bookings', user?.user_id],
    queryFn: () => adminService.getUserBookings(user?.user_id),
    enabled: !!user && open
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups', user?.user_id],
    queryFn: () => adminService.getUserGroups(user?.user_id),
    enabled: !!user && open
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['user-activity', user?.user_id],
    queryFn: () => adminService.getUserActivityLog(user?.user_id),
    enabled: !!user && open
  });

  const { data: gamification = [] } = useQuery({
    queryKey: ['user-gamification', user?.user_id],
    queryFn: () => adminService.getUserGamification(user?.user_id),
    enabled: !!user && open
  });

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    const roles: any = {
      admin: language === 'ar' ? 'مدير' : 'Admin',
      provider: language === 'ar' ? 'مقدم خدمة' : 'Provider',
      attendee: language === 'ar' ? 'مشارك' : 'Attendee'
    };
    return roles[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('admin.user360.title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">{t('admin.user360.profile')}</TabsTrigger>
            <TabsTrigger value="transactions">{t('admin.user360.transactions')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('admin.user360.bookings')}</TabsTrigger>
            <TabsTrigger value="groups">{t('admin.user360.groups')}</TabsTrigger>
            <TabsTrigger value="activity">{t('admin.user360.activity')}</TabsTrigger>
            <TabsTrigger value="gamification">{t('admin.user360.gamification')}</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="profile" className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.full_name} 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {user.full_name?.charAt(0) || 'م'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{user.full_name || t('common.notSpecified')}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={user.suspended ? 'destructive' : 'default'}>
                      {user.suspended ? t('admin.status.suspended') : t('admin.status.active')}
                    </Badge>
                    <Badge variant="outline">
                      <Shield className="w-3 h-3 ml-1" />
                      {getRoleLabel(user.user_roles?.[0]?.role || 'attendee')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">{t('admin.user360.contactInfo')}</h4>
                {user.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{user.city}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">{t('admin.user360.points')}</span>
                  </div>
                  <p className="text-2xl font-bold">{user.points_balance || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.user360.totalEarned')}: {user.total_points_earned || 0}
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{t('admin.user360.wallet')}</span>
                  </div>
                  <p className="text-2xl font-bold">{user.user_wallets?.[0]?.balance || 0} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.user360.totalRevenue')}: {user.user_wallets?.[0]?.total_earned || 0}
                  </p>
                </div>
              </div>

              {/* Registration Date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{t('admin.user360.registrationDate')}:</span>
                <span className="font-medium">
                  {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: language === 'ar' ? ar : undefined })}
                </span>
              </div>

              {/* Bio */}
              {user.bio && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">{t('admin.user360.bio')}</h4>
                  <p className="text-sm">{user.bio}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.user360.date')}</TableHead>
                    <TableHead>{t('admin.user360.type')}</TableHead>
                    <TableHead>{t('admin.user360.amount')}</TableHead>
                    <TableHead>{t('admin.user360.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}</TableCell>
                        <TableCell>{tx.transaction_type}</TableCell>
                        <TableCell>{tx.amount} {language === 'ar' ? 'ر.س' : 'SAR'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="bookings">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.user360.eventTitle')}</TableHead>
                    <TableHead>{t('admin.user360.bookingDate')}</TableHead>
                    <TableHead>{t('admin.user360.amount')}</TableHead>
                    <TableHead>{t('admin.user360.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell>{booking.event_title}</TableCell>
                        <TableCell>{format(new Date(booking.created_at), 'PP', { locale: language === 'ar' ? ar : undefined })}</TableCell>
                        <TableCell>{booking.total_amount} {language === 'ar' ? 'ر.س' : 'SAR'}</TableCell>
                        <TableCell>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="groups">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.user360.groupName')}</TableHead>
                    <TableHead>{t('admin.user360.role')}</TableHead>
                    <TableHead>{t('admin.user360.joinedDate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((group: any) => (
                      <TableRow key={group.id}>
                        <TableCell>{group.group_name}</TableCell>
                        <TableCell>
                          <Badge variant={group.role === 'owner' ? 'default' : 'secondary'}>
                            {group.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(group.joined_at), 'PP', { locale: language === 'ar' ? ar : undefined })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="activity">
              <div className="space-y-2">
                {activityLog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
                ) : (
                  activityLog.map((log: any) => (
                    <div key={log.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">{log.entity_type}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="gamification">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.user360.date')}</TableHead>
                    <TableHead>{t('admin.user360.action')}</TableHead>
                    <TableHead>{t('admin.user360.points')}</TableHead>
                    <TableHead>{t('admin.user360.description')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gamification.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    gamification.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.created_at), 'PPp', { locale: language === 'ar' ? ar : undefined })}</TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>
                          <Badge variant={entry.points > 0 ? 'default' : 'destructive'}>
                            {entry.points > 0 ? '+' : ''}{entry.points}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
