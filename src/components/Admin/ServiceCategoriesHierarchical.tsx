import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CategoryDialog } from './CategoryDialog';

interface Category {
  id: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  icon_name: string | null;
  display_order: number;
  is_active: boolean;
  subcategories?: Category[];
}

export const ServiceCategoriesHierarchical = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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

      // Build hierarchy
      const primaryCategories = data?.filter(c => !c.parent_id) || [];
      const hierarchicalData = primaryCategories.map(primary => ({
        ...primary,
        subcategories: data?.filter(c => c.parent_id === primary.id) || []
      }));

      setCategories(hierarchicalData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('حدث خطأ في تحميل التصنيفات');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري التحميل...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>إدارة تصنيفات الخدمات</CardTitle>
          <CategoryDialog type="service" onSuccess={loadCategories} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map((primary) => (
            <div key={primary.id} className="border rounded-lg">
              <Collapsible
                open={openCategories.has(primary.id)}
                onOpenChange={() => toggleCategory(primary.id)}
              >
                <div className="flex items-center justify-between p-4 bg-muted/50">
                  <div className="flex items-center gap-3 flex-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto">
                        {openCategories.has(primary.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{primary.name_ar}</span>
                        <span className="text-sm text-muted-foreground">({primary.name})</span>
                        <Badge variant="outline">
                          {primary.subcategories?.length || 0} فئات فرعية
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CategoryDialog
                      type="service"
                      category={primary}
                      onSuccess={loadCategories}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(primary.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-end mb-2">
                      <CategoryDialog
                        type="service"
                        onSuccess={loadCategories}
                      />
                    </div>
                    {primary.subcategories && primary.subcategories.length > 0 ? (
                      <div className="space-y-2">
                        {primary.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg"
                          >
                            <div>
                              <span className="font-medium">{sub.name_ar}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({sub.name})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <CategoryDialog
                                type="service"
                                category={sub}
                                onSuccess={loadCategories}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(sub.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        لا توجد فئات فرعية
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
