import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Upload, MapPin, DollarSign, Clock, Image as ImageIcon, Briefcase } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabaseServices } from '@/services/supabaseServices';

const formSchema = z.object({
  name: z.string().min(3, "اسم الخدمة يجب أن يكون 3 أحرف على الأقل"),
  nameAr: z.string().min(3, "اسم الخدمة بالعربية يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  descriptionAr: z.string().min(10, "الوصف بالعربية يجب أن يكون 10 أحرف على الأقل"),
  location: z.string().min(3, "الموقع مطلوب"),
  locationAr: z.string().min(3, "الموقع بالعربية مطلوب"),
  categoryId: z.string().min(1, "يجب اختيار فئة"),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  durationMinutes: z.number().min(1, "المدة يجب أن تكون دقيقة واحدة على الأقل"),
  pricingType: z.enum(['per_hour', 'per_day', 'fixed']).default('fixed'),
  imageUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const CreateService = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load categories from Supabase
  const { data: categories = [] } = useSupabaseQuery({
    queryKey: ['categories'],
    queryFn: () => supabaseServices.getCategories()
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      description: "",
      descriptionAr: "",
      location: "",
      locationAr: "",
      categoryId: "",
      price: 0,
      durationMinutes: 60,
      pricingType: 'fixed' as const,
      imageUrl: ""
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue("imageUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('services').insert({
        name: data.name,
        name_ar: data.nameAr,
        description: data.description,
        description_ar: data.descriptionAr,
        location: data.location,
        location_ar: data.locationAr,
        category_id: data.categoryId,
        price: data.price,
        duration_minutes: data.durationMinutes,
        image_url: data.imageUrl,
        provider_id: user.id,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح!",
        description: "تم إنشاء الخدمة وإرسالها للمراجعة"
      });

      form.reset();
      setImagePreview(null);
    } catch (error) {
      console.error('Error creating service:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الخدمة",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              إنشاء خدمة جديدة
            </h1>
            <p className="text-lg text-muted-foreground">
              قدم خدماتك للمغامرين وكن جزءاً من مجتمع الأنشطة الخارجية
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      name="nameAr"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وصف الخدمة (English)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Service Description"
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="descriptionAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وصف الخدمة (العربية)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="وصف مفصل للخدمة..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>فئة الخدمة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر فئة الخدمة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(categories) ? categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name_ar || category.nameAr}
                              </SelectItem>
                            )) : []}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    الموقع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموقع (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="locationAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموقع (العربية)</FormLabel>
                          <FormControl>
                            <Input placeholder="الرياض - حي النخيل" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Duration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    التسعير والمدة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="pricingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع التسعير</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع التسعير" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="per_hour">بالساعة</SelectItem>
                            <SelectItem value="per_day">باليوم</SelectItem>
                            <SelectItem value="fixed">سعر ثابت</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر (ريال)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المدة (بالدقائق)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="60"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    صورة الخدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
                        {imagePreview ? (
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">انقر لتحديد صورة</span> أو اسحب وأفلت
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG أو JPEG (MAX. 5MB)
                            </p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء الخدمة"}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => form.reset()}>
                  إعادة تعيين
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateService;