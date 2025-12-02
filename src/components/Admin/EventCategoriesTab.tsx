import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';

export const EventCategoriesTab = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('*')
        .order('name_ar', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
      console.log('Loaded user interests:', data?.length);
    } catch (error) {
      console.error('Error loading interests:', error);
      toast.error('حدث خطأ في تحميل الاهتمامات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاهتمام؟')) return;
    
    try {
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success('تم حذف الاهتمام');
      loadCategories();
    } catch (error) {
      console.error('Error deleting interest:', error);
      toast.error('حدث خطأ في الحذف');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>إدارة اهتمامات المستخدمين</CardTitle>
          <CategoryDialog type="interest" onSuccess={loadCategories} />
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
                <TableHead>الأيقونة</TableHead>
                <TableHead>عدد الفعاليات</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name_ar}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {category.icon_name || category.icon || '—'}
                    </code>
                  </TableCell>
                  <TableCell>{category.event_count || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <CategoryDialog
                        type="event"
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
