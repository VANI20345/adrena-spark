import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { iconMap } from '@/components/Home/CategorySection';

interface CategoryDialogProps {
  onSuccess?: () => void;
  category?: any;
  type?: 'event' | 'service' | 'interest';
}

export const CategoryDialog = ({ onSuccess, category, type = 'service' }: CategoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mainCategories, setMainCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    name_ar: category?.name_ar || '',
    icon_name: category?.icon_name || '',
    parent_id: category?.parent_id || null,
    display_order: category?.display_order || 0
  });

  useEffect(() => {
    if (type === 'service' && open) {
      loadMainCategories();
    }
  }, [open, type]);

  const loadMainCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setMainCategories(data || []);
    } catch (error) {
      console.error('Error loading main categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tableName = type === 'service' ? 'service_categories' : type === 'interest' ? 'user_interests' : 'categories';
      
      if (category) {
        const { error } = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', category.id);
        
        if (error) throw error;
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([{ ...formData, is_active: true }]);
        
        if (error) throw error;
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

          {type === 'service' && (
            <div>
              <Label htmlFor="parent_id">القسم الرئيسي (اختياري)</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => 
                  setFormData({ ...formData, parent_id: value === 'none' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون - قسم رئيسي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون - قسم رئيسي</SelectItem>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label htmlFor="icon_name">اختر الأيقونة</Label>
            <Select
              value={formData.icon_name || 'Trophy'}
              onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر أيقونة" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {Object.keys(iconMap).map((iconName) => {
                  const IconComponent = iconMap[iconName];
                  return (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{iconName}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="display_order">ترتيب العرض</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              min="0"
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
