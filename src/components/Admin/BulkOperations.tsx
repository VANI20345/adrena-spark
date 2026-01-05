import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkOperationsProps {
  items: any[];
  type: 'events' | 'services';
  onRefresh: () => void;
}

export const BulkOperations = ({ items, type, onRefresh }: BulkOperationsProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedItems(items.map(i => i.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) {
      toast.error('يرجى اختيار عناصر أولاً');
      return;
    }

    try {
      const table = type === 'events' ? 'events' : 'services';
      await supabase
        .from(table)
        .update({ status: 'approved' })
        .in('id', selectedItems);

      toast.success(`تم قبول ${selectedItems.length} ${type === 'events' ? 'فعالية' : 'خدمة'}`);
      clearSelection();
      onRefresh();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleBulkReject = async () => {
    if (selectedItems.length === 0) {
      toast.error('يرجى اختيار عناصر أولاً');
      return;
    }

    try {
      const table = type === 'events' ? 'events' : 'services';
      await supabase
        .from(table)
        .update({ status: 'cancelled' })
        .in('id', selectedItems);

      toast.success(`تم رفض ${selectedItems.length} ${type === 'events' ? 'فعالية' : 'خدمة'}`);
      clearSelection();
      onRefresh();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.error('يرجى اختيار عناصر أولاً');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف ${selectedItems.length} ${type === 'events' ? 'فعالية' : 'خدمة'}؟`)) {
      return;
    }

    try {
      const table = type === 'events' ? 'events' : 'services';
      await supabase
        .from(table)
        .delete()
        .in('id', selectedItems);

      toast.success(`تم حذف ${selectedItems.length} ${type === 'events' ? 'فعالية' : 'خدمة'}`);
      clearSelection();
      onRefresh();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>العمليات الجماعية</CardTitle>
        <CardDescription>
          قم بتحديد عناصر متعددة لتنفيذ عمليات عليها دفعة واحدة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={selectAll}>
            تحديد الكل ({items.length})
          </Button>
          <Button size="sm" variant="outline" onClick={clearSelection}>
            إلغاء التحديد
          </Button>
          <Badge variant="secondary">
            محدد: {selectedItems.length}
          </Badge>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleBulkApprove}>
              <CheckCircle className="w-4 h-4 ml-1" />
              قبول المحدد ({selectedItems.length})
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkReject}>
              <XCircle className="w-4 h-4 ml-1" />
              رفض المحدد ({selectedItems.length})
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <div className="flex-1">
                <p className="font-medium">
                  {type === 'events' ? item.title_ar : item.name_ar}
                </p>
                <p className="text-sm text-muted-foreground">
                  {type === 'events' 
                    ? item.description_ar?.substring(0, 60) 
                    : item.description_ar?.substring(0, 60)
                  }...
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
