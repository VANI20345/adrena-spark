import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';

export const ServiceCategoriesTab = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      // Remove any remaining duplicates by name_ar (shouldn't happen after migration)
      const uniqueCategories = data?.filter((category, index, self) =>
        index === self.findIndex((c) => c.name_ar === category.name_ar)
      ) || [];
      
      setCategories(uniqueCategories);
      console.log('Loaded service categories:', uniqueCategories.length);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('حدث خطأ في تحميل التصنيفات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    
    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success('تم حذف التصنيف');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('حدث خطأ في الحذف');
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '—';
    const parent = categories.find(c => c.id === parentId);
    return parent?.name_ar || '—';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>إدارة تصنيفات الخدمات</CardTitle>
          <CategoryDialog type="service" onSuccess={loadCategories} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم (عربي)</TableHead>
                <TableHead>الاسم (English)</TableHead>
                <TableHead>القسم الرئيسي</TableHead>
                <TableHead>الأيقونة</TableHead>
                <TableHead>الترتيب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name_ar}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{getParentName(category.parent_id)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {category.icon_name || '—'}
                    </code>
                  </TableCell>
                  <TableCell>{category.display_order}</TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? 'default' : 'secondary'}>
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <CategoryDialog
                        type="service"
                        category={category}
                        onSuccess={loadCategories}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
