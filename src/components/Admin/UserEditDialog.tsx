import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminService } from '@/services/adminService';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export const UserEditDialog = ({ open, onOpenChange, user, onSuccess }: UserEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    city: '',
    bio: '',
    role: 'attendee' as 'attendee' | 'provider' | 'admin'
  });

  useEffect(() => {
    if (user) {
      const currentRole = user.user_roles?.[0]?.role || 'attendee';
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        city: user.city || '',
        bio: user.bio || '',
        role: currentRole
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile data
      const { full_name, phone, city, bio, role } = formData;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name, phone, city, bio })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = user.user_roles?.[0]?.role;
      if (role !== currentRole) {
        await adminService.updateUserRole(user.user_id, role);
      }

      toast.success('تم تحديث بيانات المستخدم والرتبة بنجاح');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('حدث خطأ في التحديث');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">رقم الجوال</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="city">المدينة</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="bio">نبذة</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="role">رتبة المستخدم</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendee">مشارك</SelectItem>
                <SelectItem value="provider">مقدم خدمة</SelectItem>
                <SelectItem value="admin">آدمن</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
