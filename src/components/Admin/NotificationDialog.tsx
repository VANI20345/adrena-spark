import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationDialog = ({ open, onOpenChange }: NotificationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.targetAudience === 'all') {
        await adminService.sendBulkNotification({
          title: formData.title,
          message: formData.message,
          type: formData.type
        });
      } else {
        await adminService.sendBulkNotification({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          role: formData.targetAudience as 'attendee' | 'organizer' | 'provider' | 'admin'
        });
      }

      toast.success('تم إرسال الإشعارات بنجاح');
      onOpenChange(false);
      setFormData({ title: '', message: '', type: 'info', targetAudience: 'all' });
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('حدث خطأ أثناء إرسال الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إرسال إشعار جماعي</DialogTitle>
          <DialogDescription>
            أرسل إشعاراً لجميع المستخدمين أو لفئة معينة
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">عنوان الإشعار</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="message">رسالة الإشعار</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              maxLength={500}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">نوع الإشعار</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">معلومات</SelectItem>
                  <SelectItem value="success">نجاح</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audience">الفئة المستهدفة</Label>
              <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="attendee">الحضور</SelectItem>
                  <SelectItem value="organizer">المنظمون</SelectItem>
                  <SelectItem value="provider">مقدمو الخدمات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              <Bell className="w-4 h-4 ml-2" />
              {loading ? 'جاري الإرسال...' : 'إرسال الإشعار'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
