import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './CategoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';

export const ServiceCategoriesTab = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguageContext();
  const isRTL = language === 'ar';

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
      
      const allCategories = data || [];
      const mainCategories = allCategories.filter(cat => !cat.parent_id);
      const subCategories = allCategories.filter(cat => cat.parent_id);
      
      const organized: any[] = [];
      mainCategories.forEach(main => {
        organized.push({ ...main, isParent: true });
        const subs = subCategories.filter(sub => sub.parent_id === main.id);
        subs.forEach(sub => {
          organized.push({ ...sub, isChild: true });
        });
      });
      
      setCategories(organized);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error(isRTL ? 'حدث خطأ في تحميل التصنيفات' : 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Are you sure you want to delete this category?')) return;
    
    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      toast.success(isRTL ? 'تم حذف التصنيف' : 'Category deleted');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(isRTL ? 'حدث خطأ في الحذف' : 'Error deleting');
    }
  };

  const mainCategories = categories.filter(cat => cat.isParent);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle>{isRTL ? 'إدارة تصنيفات الخدمات' : 'Service Categories Management'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? 'قم بإضافة وإدارة الفئات الرئيسية والفرعية للخدمات' : 'Add and manage main and sub categories for services'}
              </p>
            </div>
            <CategoryDialog type="service" onSuccess={loadCategories} />
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <div className="space-y-4">
          {mainCategories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {isRTL ? 'لا توجد فئات. قم بإضافة فئة رئيسية للبدء.' : 'No categories. Add a main category to start.'}
              </CardContent>
            </Card>
          ) : (
            mainCategories.map((mainCat) => {
              const subCats = getSubCategories(mainCat.id);
              return (
                <Card key={mainCat.id} className="overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                  <CardHeader className="bg-muted/50">
                    <div className={`service-row flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Badge variant="default" className="text-base px-3 py-1">
                          {isRTL ? 'فئة رئيسية' : 'Main Category'}
                        </Badge>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <h3 className="text-xl font-bold">{isRTL ? mainCat.name_ar : mainCat.name}</h3>
                          <p className="text-sm text-muted-foreground">{isRTL ? mainCat.name : mainCat.name_ar}</p>
                        </div>
                      </div>
                      <div className={`actions flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                    {subCats.length > 0 ? (
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h4 className={`text-sm font-semibold text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? `الفئات الفرعية (${subCats.length})` : `Sub Categories (${subCats.length})`}
                          </h4>
                        </div>
                        <div className="grid gap-2">
                          {subCats.map((subCat) => (
                            <div
                              key={subCat.id}
                              className={`service-row flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            >
                              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-1 h-8 bg-primary/30 rounded"></div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                  <p className="font-medium">{isRTL ? subCat.name_ar : subCat.name}</p>
                                  <p className="text-xs text-muted-foreground">{isRTL ? subCat.name : subCat.name_ar}</p>
                                </div>
                              </div>
                              <div className={`actions flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {subCat.icon_name || '—'}
                                </code>
                                <Badge variant={subCat.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {subCat.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
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
                        {isRTL ? 'لا توجد فئات فرعية. قم بإضافة فئة فرعية لهذا القسم.' : 'No sub categories. Add a sub category for this section.'}
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
