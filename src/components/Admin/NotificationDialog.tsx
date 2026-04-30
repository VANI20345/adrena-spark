import React, { useState, useEffect } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRTL?: boolean;
}

export const NotificationDialog = ({ open, onOpenChange, isRTL = true }: NotificationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all'
  });
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; display_id: string } | null>(null);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<{ user_id: string; full_name: string; display_id: string }[]>([]);

  // Debounced search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchTerm.length >= 2) {
        searchUsers(userSearchTerm);
      } else {
        setUserSearchResults([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const searchUsers = async (search: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_id')
        .or(`full_name.ilike.%${search}%,display_id.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.targetAudience === 'specific_user') {
        if (!selectedUser) {
          toast.error('يرجى اختيار مستخدم');
          setLoading(false);
          return;
        }
        await adminService.sendNotification({
          userIds: [selectedUser.id],
          title: formData.title,
          message: formData.message,
          type: formData.type
        });
      } else if (formData.targetAudience === 'all') {
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
          role: formData.targetAudience as 'attendee' | 'provider' | 'admin'
        });
      }

      toast.success('تم إرسال الإشعارات بنجاح');
      onOpenChange(false);
      setFormData({ title: '', message: '', type: 'info', targetAudience: 'all' });
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('حدث خطأ أثناء إرسال الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>إرسال إشعار جماعي</DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            أرسل إشعاراً لجميع المستخدمين أو لفئة معينة
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <Label htmlFor="title" className={isRTL ? 'text-right block' : ''}>عنوان الإشعار</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={100}
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className={isRTL ? 'text-right' : 'text-left'}>
            <Label htmlFor="message" className={isRTL ? 'text-right block' : ''}>رسالة الإشعار</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              maxLength={500}
              rows={4}
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="type" className={isRTL ? 'text-right block' : ''}>نوع الإشعار</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectItem value="info">معلومات</SelectItem>
                  <SelectItem value="success">نجاح</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label htmlFor="audience" className={isRTL ? 'text-right block' : ''}>الفئة المستهدفة</Label>
              <Select value={formData.targetAudience} onValueChange={(value) => {
                setFormData({ ...formData, targetAudience: value });
                setSelectedUser(null);
              }}>
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="attendee">الحضور</SelectItem>
                  <SelectItem value="provider">مقدمو الخدمات</SelectItem>
                  <SelectItem value="specific_user">مستخدم محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.targetAudience === 'specific_user' && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label className={isRTL ? 'text-right block' : ''}>اختر مستخدم</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className={`w-full ${isRTL ? 'flex-row-reverse text-right' : 'justify-between text-left'}`}
                  >
                    {selectedUser
                      ? `${selectedUser.name} (${selectedUser.display_id})`
                      : "ابحث عن مستخدم..."}
                    <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${isRTL ? 'mr-auto' : 'ml-2'}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
                  <Command dir={isRTL ? 'rtl' : 'ltr'}>
                    <CommandInput 
                      placeholder="ابحث بالاسم أو ID..." 
                      value={userSearchTerm}
                      onValueChange={setUserSearchTerm}
                      className={isRTL ? 'text-right' : 'text-left'}
                    />
                    <CommandEmpty>لا توجد نتائج</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {userSearchResults.map((user) => (
                        <CommandItem
                          key={user.user_id}
                          value={user.user_id}
                          onSelect={() => {
                            setSelectedUser({
                              id: user.user_id,
                              name: user.full_name,
                              display_id: user.display_id
                            });
                            setUserSearchOpen(false);
                          }}
                          className={isRTL ? 'flex-row-reverse text-right' : 'text-left'}
                        >
                          <Check
                            className={cn(
                              `h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`,
                              selectedUser?.id === user.user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
                            <span>{user.full_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {user.display_id}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className={`flex gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className={isRTL ? 'flex-row-reverse' : ''}>
              <Bell className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {loading ? 'جاري الإرسال...' : 'إرسال الإشعار'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
