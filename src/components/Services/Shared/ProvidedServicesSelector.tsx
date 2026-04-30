import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";

interface ProvidedServicesSelectorProps {
  form: UseFormReturn<any>;
}

const ProvidedServicesSelector = ({ form }: ProvidedServicesSelectorProps) => {
  const [customService, setCustomService] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const { data: categories, isLoading } = useSupabaseQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  const selectedServices = form.watch('provided_services') || [];
  
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  const addCustomService = () => {
    if (customService.trim()) {
      const current = form.getValues('provided_services') || [];
      form.setValue('provided_services', [...current, customService.trim()]);
      setCustomService("");
      setShowCustomInput(false);
    }
  };

  const removeService = (service: string) => {
    const current = form.getValues('provided_services') || [];
    form.setValue('provided_services', current.filter((s: string) => s !== service));
  };

  const addCategoryService = (categoryName: string) => {
    const current = form.getValues('provided_services') || [];
    if (!current.includes(categoryName)) {
      form.setValue('provided_services', [...current, categoryName]);
    }
  };

  return (
    <FormField
      control={form.control}
      name="provided_services"
      render={() => (
        <FormItem>
          <FormLabel>الخدمات المقدمة</FormLabel>
          <FormControl>
            <div className="space-y-4">
              <Select onValueChange={addCategoryService} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "جاري التحميل..." : "اختر خدمة من القائمة"} />
                </SelectTrigger>
                <SelectContent>
                  {safeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name_ar}>
                      {cat.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!showCustomInput ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة خدمة مخصصة
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="أدخل اسم الخدمة المخصصة"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                  />
                  <Button type="button" onClick={addCustomService}>
                    إضافة
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCustomInput(false)}>
                    إلغاء
                  </Button>
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/50">
                  {selectedServices.map((service: string) => (
                    <Badge key={service} variant="secondary" className="gap-2">
                      {service}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeService(service)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProvidedServicesSelector;