import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";

interface ServiceBasicInfoProps {
  form: UseFormReturn<any>;
  showTrainerName?: boolean;
}

const ServiceBasicInfo = ({ form, showTrainerName = false }: ServiceBasicInfoProps) => {
  const description = form.watch('description') || '';
  const descriptionAr = form.watch('description_ar') || '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم الخدمة (English)</FormLabel>
              <FormControl>
                <Input placeholder="Service Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم الخدمة (العربية)</FormLabel>
              <FormControl>
                <Input placeholder="اسم الخدمة" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {showTrainerName && (
        <FormField
          control={form.control}
          name="trainer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المدرب</FormLabel>
              <FormControl>
                <Input placeholder="أدخل اسم المدرب" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وصف الخدمة (English)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Service Description (minimum 200 characters)"
                  className="min-h-[150px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription className={description.length < 200 ? "text-destructive" : "text-muted-foreground"}>
                {description.length}/200 حرف
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وصف الخدمة (العربية)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="وصف مفصل للخدمة (200 حرف على الأقل)"
                  className="min-h-[150px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription className={descriptionAr.length < 200 ? "text-destructive" : "text-muted-foreground"}>
                {descriptionAr.length}/200 حرف
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ServiceBasicInfo;