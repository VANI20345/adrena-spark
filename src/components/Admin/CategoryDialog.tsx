import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/adminService';

interface CategoryDialogProps {
  onSuccess?: () => void;
  category?: any;
}

export const CategoryDialog = ({ onSuccess, category }: CategoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    name_ar: category?.name_ar || '',
    description: category?.description || '',
    description_ar: category?.description_ar || '',
    icon_name: category?.icon_name || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        await adminService.updateCategory(category.id, formData);
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        await adminService.createCategory(formData);
        toast.success('تم إضافة الفئة بنجاح');
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('حدث خطأ أثناء حفظ الفئة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button size="sm" variant="outline">تعديل</Button>
        ) : (
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            إضافة فئة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
          <DialogDescription>
            {category ? 'قم بتحديث معلومات الفئة' : 'أضف فئة جديدة للفعاليات والخدمات'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">الاسم (English)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name_ar">الاسم (العربية)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">الوصف (English)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="description_ar">الوصف (العربية)</Label>
            <Textarea
              id="description_ar"
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="icon_name">اسم الأيقونة (Lucide Icon)</Label>
            <Input
              id="icon_name"
              value={formData.icon_name}
              onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
              placeholder="Calendar, Music, Trophy, etc."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : category ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
