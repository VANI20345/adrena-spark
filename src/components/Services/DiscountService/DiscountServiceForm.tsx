import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import ServiceBasicInfo from "../Shared/ServiceBasicInfo";
import ProvidedServicesSelector from "../Shared/ProvidedServicesSelector";
import ServiceImageUpload from "../Shared/ServiceImageUpload";
import { Percent, Calendar, MapPin, Users, DollarSign } from "lucide-react";

const discountServiceSchema = z.object({
  name: z.string().min(3, "اسم الخدمة يجب أن يكون 3 أحرف على الأقل"),
  name_ar: z.string().min(3, "اسم الخدمة بالعربية يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(200, "الوصف يجب أن يكون 200 حرف على الأقل"),
  description_ar: z.string().min(200, "الوصف بالعربية يجب أن يكون 200 حرف على الأقل"),
  provided_services: z.array(z.string()).min(1, "يجب اختيار خدمة واحدة على الأقل"),
  start_date: z.string().min(1, "تاريخ البدء مطلوب"),
  end_date: z.string().min(1, "تاريخ الانتهاء مطلوب"),
  location: z.string().min(3, "الموقع مطلوب"),
  location_ar: z.string().min(3, "الموقع بالعربية مطلوب"),
  max_capacity: z.number().min(1, "يجب إدخال عدد صحيح"),
  is_free: z.boolean(),
  original_price: z.number().optional(),
  discount_percentage: z.number().min(1).max(99).optional(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء", path: ["end_date"] }
).refine(
  (data) => data.is_free || (data.original_price && data.original_price > 0 && data.discount_percentage),
  { message: "السعر الأصلي ونسبة الخصم مطلوبة للخدمات المدفوعة", path: ["original_price"] }
);

type FormData = z.infer<typeof discountServiceSchema>;

const DiscountServiceForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(discountServiceSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      provided_services: [],
      start_date: "",
      end_date: "",
      location: "",
      location_ar: "",
      max_capacity: 1,
      is_free: false,
      original_price: 0,
      discount_percentage: 10,
    }
  });

  const isFree = form.watch("is_free");
  const originalPrice = form.watch("original_price") || 0;
  const discountPercentage = form.watch("discount_percentage") || 0;
  const discountedPrice = originalPrice * (1 - discountPercentage / 100);

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: "خطأ", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let thumbnailUrl = null;
      let detailImageUrls: string[] = [];

      const thumbnail = form.getValues("thumbnail" as any);
      if (thumbnail) {
        thumbnailUrl = await uploadFile(thumbnail, 'service-thumbnails');
      }

      const detailImages = form.getValues("detail_images" as any) || [];
      if (detailImages.length > 0) {
        detailImageUrls = await Promise.all(
          detailImages.map((img: File) => uploadFile(img, 'service-images'))
        );
      }

      const finalPrice = data.is_free ? 0 : discountedPrice;

      const { error } = await supabase.from('services').insert({
        provider_id: user.id,
        service_type: 'discount',
        name: data.name,
        name_ar: data.name_ar,
        description: data.description,
        description_ar: data.description_ar,
        location: data.location,
        location_ar: data.location_ar,
        price: finalPrice,
        original_price: data.original_price,
        discount_percentage: data.discount_percentage,
        start_date: data.start_date,
        end_date: data.end_date,
        max_capacity: data.max_capacity,
        current_capacity: 0,
        is_free: data.is_free,
        image_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        detail_images: detailImageUrls,
        provided_services: data.provided_services,
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: "تم بنجاح!", description: "تم إنشاء الخدمة المخفضة وإرسالها للمراجعة" });
      navigate('/manage-services');
    } catch (error) {
      console.error('Error creating discount service:', error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء إنشاء الخدمة", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" onClick={() => navigate('/create-service')} className="mb-4">
              ← العودة لاختيار النوع
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              إنشاء خدمة مخفضة
            </h1>
            <p className="text-lg text-muted-foreground">
              قدم خدماتك بأسعار مخفضة لفترة محدودة
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ServiceBasicInfo form={form} />
                  <ProvidedServicesSelector form={form} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    فترة الخصم
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ البدء</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الانتهاء</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

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
                      name="location_ar"
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    السعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="max_capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الأشخاص / المنتجات المتاحة</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="مثال: 50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    التسعير
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="is_free"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel className="text-base">خدمة مجانية</FormLabel>
                          <p className="text-sm text-muted-foreground">هل هذه الخدمة مجانية؟</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!isFree && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="original_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>السعر الأصلي (ريال)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.01"
                                  placeholder="100"
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
                          name="discount_percentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نسبة الخصم (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  max="99"
                                  placeholder="25"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {originalPrice > 0 && discountPercentage > 0 && (
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">السعر الأصلي:</span>
                            <span className="line-through">{originalPrice.toFixed(2)} ر.س</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">نسبة الخصم:</span>
                            <span className="text-destructive font-bold">-{discountPercentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-lg font-bold">
                            <span>السعر بعد الخصم:</span>
                            <span className="text-primary">{discountedPrice.toFixed(2)} ر.س</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                            <span>الوفر:</span>
                            <span className="text-green-600">{(originalPrice - discountedPrice).toFixed(2)} ر.س</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>صور الخدمة</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceImageUpload form={form} />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء الخدمة المخفضة"}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => navigate('/create-service')}>
                  إلغاء
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

export default DiscountServiceForm;