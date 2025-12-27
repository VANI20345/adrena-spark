import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Tags } from 'lucide-react';
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
      console.log('Loaded user interests:', data?.length);
    } catch (error) {
      console.error('Error loading interests:', error);
      toast.error(t('admin.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm(t('admin.confirmDelete'))) return;
    
    try {
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success(t('admin.success'));
      loadCategories();
    } catch (error) {
      console.error('Error deleting interest:', error);
      toast.error(t('admin.error'));
    }
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            {t('admin.eventCategories')}
          </CardTitle>
          <CategoryDialog type="interest" onSuccess={loadCategories} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">{t('admin.loading')}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.nameAr')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.nameEn')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.icon')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.eventsCount')}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('admin.action')}</TableHead>
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
                    <TableCell>
                      <Badge variant="secondary">{category.event_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
