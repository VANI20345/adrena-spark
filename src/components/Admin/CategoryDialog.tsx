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
import { Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { iconMap } from '@/components/Home/CategorySection';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface CategoryDialogProps {
  onSuccess?: () => void;
  category?: any;
  type?: 'event' | 'service' | 'interest';
}

export const CategoryDialog = ({ onSuccess, category, type = 'service' }: CategoryDialogProps) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
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
        toast.success(isRTL ? 'تم تحديث الفئة بنجاح' : 'Category updated successfully');
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([{ ...formData, is_active: true }]);
        
        if (error) throw error;
        toast.success(isRTL ? 'تم إضافة الفئة بنجاح' : 'Category added successfully');
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(isRTL ? 'حدث خطأ أثناء حفظ الفئة' : 'Error saving category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4" />
            <span className={isRTL ? 'mr-1' : 'ml-1'}>{isRTL ? 'تعديل' : 'Edit'}</span>
          </Button>
        ) : (
          <Button>
            <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'إضافة فئة' : 'Add Category'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {category 
              ? (isRTL ? 'تعديل الفئة' : 'Edit Category')
              : (isRTL ? 'إضافة فئة جديدة' : 'Add New Category')
            }
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {category 
              ? (isRTL ? 'قم بتحديث معلومات الفئة' : 'Update category information')
              : (isRTL ? 'أضف فئة جديدة للفعاليات والخدمات' : 'Add a new category for events and services')
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className={isRTL ? 'text-right block' : 'text-left block'}>
                {isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="name_ar" className={isRTL ? 'text-right block' : 'text-left block'}>
                {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
              </Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                required
                dir="rtl"
              />
            </div>
          </div>

          {type === 'service' && (
            <div>
              <Label htmlFor="parent_id" className={isRTL ? 'text-right block' : 'text-left block'}>
                {isRTL ? 'القسم الرئيسي (اختياري)' : 'Parent Category (Optional)'}
              </Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => 
                  setFormData({ ...formData, parent_id: value === 'none' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'بدون - قسم رئيسي' : 'None - Main Category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? 'بدون - قسم رئيسي' : 'None - Main Category'}</SelectItem>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isRTL ? cat.name_ar : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label htmlFor="icon_name" className={isRTL ? 'text-right block' : 'text-left block'}>
              {isRTL ? 'اختر الأيقونة' : 'Select Icon'}
            </Label>
            <Select
              value={formData.icon_name || 'Trophy'}
              onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? 'اختر أيقونة' : 'Select an icon'} />
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
            <Label htmlFor="display_order" className={isRTL ? 'text-right block' : 'text-left block'}>
              {isRTL ? 'ترتيب العرض' : 'Display Order'}
            </Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div className={`flex gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (isRTL ? 'جاري الحفظ...' : 'Saving...')
                : category 
                  ? (isRTL ? 'تحديث' : 'Update')
                  : (isRTL ? 'إضافة' : 'Add')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
