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
      
      // تنظيم الفئات بشكل هرمي: فئات رئيسية وفئات فرعية
      const allCategories = data || [];
      
      // فصل الفئات الرئيسية والفرعية
      const mainCategories = allCategories.filter(cat => !cat.parent_id);
      const subCategories = allCategories.filter(cat => cat.parent_id);
      
      // دمج الفئات الرئيسية مع الفرعية
      const organized: any[] = [];
      mainCategories.forEach(main => {
        organized.push({ ...main, isParent: true });
        const subs = subCategories.filter(sub => sub.parent_id === main.id);
        subs.forEach(sub => {
          organized.push({ ...sub, isChild: true });
        });
      });
      
      setCategories(organized);
      console.log('Loaded service categories:', organized.length);
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

  // فصل الفئات الرئيسية والفرعية
  const mainCategories = categories.filter(cat => cat.isParent);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  return (
    <div className="space-y-6">
      {/* زر إضافة فئة رئيسية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>إدارة تصنيفات الخدمات</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                قم بإضافة وإدارة الفئات الرئيسية والفرعية للخدمات
              </p>
            </div>
            <CategoryDialog type="service" onSuccess={loadCategories} />
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="space-y-4">
          {mainCategories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                لا توجد فئات. قم بإضافة فئة رئيسية للبدء.
              </CardContent>
            </Card>
          ) : (
            mainCategories.map((mainCat) => {
              const subCats = getSubCategories(mainCat.id);
              return (
                <Card key={mainCat.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="text-base px-3 py-1">
                          فئة رئيسية
                        </Badge>
                        <div>
                          <h3 className="text-xl font-bold">{mainCat.name_ar}</h3>
                          <p className="text-sm text-muted-foreground">{mainCat.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          {mainCat.icon_name || '—'}
                        </code>
                        <CategoryDialog
                          type="service"
                          category={mainCat}
                          onSuccess={loadCategories}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(mainCat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    {/* الفئات الفرعية */}
                    {subCats.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">
                            الفئات الفرعية ({subCats.length})
                          </h4>
                        </div>
                        <div className="grid gap-2">
                          {subCats.map((subCat) => (
                            <div
                              key={subCat.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-8 bg-primary/30 rounded"></div>
                                <div>
                                  <p className="font-medium">{subCat.name_ar}</p>
                                  <p className="text-xs text-muted-foreground">{subCat.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {subCat.icon_name || '—'}
                                </code>
                                <Badge variant={subCat.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {subCat.is_active ? 'نشط' : 'غير نشط'}
                                </Badge>
                                <CategoryDialog
                                  type="service"
                                  category={subCat}
                                  onSuccess={loadCategories}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(subCat.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        لا توجد فئات فرعية. قم بإضافة فئة فرعية لهذا القسم.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
