import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Tags } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';

export const EventCategoriesTab = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, isRTL, language } = useLanguageContext();

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
    } catch (error) {
      console.error('Error loading interests:', error);
      toast.error(isRTL ? 'حدث خطأ في التحميل' : 'Error loading');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Are you sure you want to delete this category?')) return;
    
    try {
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully');
      loadCategories();
    } catch (error) {
      console.error('Error deleting interest:', error);
      toast.error(isRTL ? 'حدث خطأ في الحذف' : 'Error deleting');
    }
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Tags className="w-5 h-5" />
            {isRTL ? 'تصنيفات الفعاليات والاهتمامات' : 'Event Categories & Interests'}
          </CardTitle>
          <CategoryDialog type="interest" onSuccess={loadCategories} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {isRTL ? 'الأيقونة' : 'Icon'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {isRTL ? 'عدد الفعاليات' : 'Events Count'}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {isRTL ? 'لا توجد تصنيفات' : 'No categories found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {category.name_ar}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {category.name}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {category.icon_name || category.icon || '—'}
                        </code>
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Badge variant="secondary">{category.event_count || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <CategoryDialog
                            type="interest"
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
