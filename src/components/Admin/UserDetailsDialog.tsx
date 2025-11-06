import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, MapPin, Phone, Shield, Wallet, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export const UserDetailsDialog = ({ open, onOpenChange, user }: UserDetailsDialogProps) => {
  if (!user) return null;

  const getRoleLabel = (role: string) => {
    const roles: any = {
      admin: 'مدير',
      organizer: 'منظم فعاليات',
      provider: 'مقدم خدمة',
      attendee: 'مشارك'
    };
    return roles[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المستخدم</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
              <h3 className="text-xl font-bold">{user.full_name || 'غير محدد'}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user.suspended ? 'destructive' : 'default'}>
                  {user.suspended ? 'معلق' : 'نشط'}
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
            <h4 className="font-semibold text-sm text-muted-foreground">معلومات الاتصال</h4>
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
                <span className="text-sm text-muted-foreground">النقاط</span>
              </div>
              <p className="text-2xl font-bold">{user.points_balance || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                إجمالي مكتسب: {user.total_points_earned || 0}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">المحفظة</span>
              </div>
              <p className="text-2xl font-bold">{user.user_wallets?.[0]?.balance || 0} ريال</p>
              <p className="text-xs text-muted-foreground mt-1">
                إجمالي الإيرادات: {user.user_wallets?.[0]?.total_earned || 0}
              </p>
            </div>
          </div>

          {/* Registration Date */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">معلومات الحساب</h4>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>تاريخ التسجيل:</span>
              <span className="font-medium">
                {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: ar })}
              </span>
            </div>
          </div>

          {/* Suspension Info */}
          {user.suspended && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-semibold text-destructive mb-2">معلومات التعليق</h4>
              <div className="space-y-2 text-sm">
                {user.suspension_reason && (
                  <p><span className="font-medium">السبب:</span> {user.suspension_reason}</p>
                )}
                {user.suspended_at && (
                  <p>
                    <span className="font-medium">تاريخ التعليق:</span>{' '}
                    {format(new Date(user.suspended_at), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                )}
                {user.suspended_until && (
                  <p>
                    <span className="font-medium">ينتهي في:</span>{' '}
                    {format(new Date(user.suspended_until), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">نبذة</h4>
              <p className="text-sm">{user.bio}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
