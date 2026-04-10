import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useLanguageContext } from "@/contexts/LanguageContext";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import ServiceBasicInfo from "../Shared/ServiceBasicInfo";
import ProvidedServicesSelector from "../Shared/ProvidedServicesSelector";
import ServiceImageUpload from "../Shared/ServiceImageUpload";
import { Percent, Calendar, MapPin, Users, DollarSign, Clock } from "lucide-react";

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
  // Capacity settings
  has_capacity_limit: z.boolean(),
  max_capacity: z.number().min(1).optional(),
  // Pricing settings
  is_free: z.boolean(),
  pricing_type: z.enum(['fixed', 'per_hour']),
  original_price: z.number().optional(),
  discount_percentage: z.number().min(1).max(99).optional(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء", path: ["end_date"] }
).refine(
  (data) => data.is_free || (data.original_price && data.original_price > 0),
  { message: "السعر الأصلي مطلوب للخدمات المدفوعة", path: ["original_price"] }
).refine(
  (data) => !data.has_capacity_limit || (data.max_capacity && data.max_capacity > 0),
  { message: "يجب تحديد الحد الأقصى للحجوزات", path: ["max_capacity"] }
);

type FormData = z.infer<typeof discountServiceSchema>;

const DiscountServiceForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
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
      has_capacity_limit: false,
      max_capacity: 1,
      is_free: false,
      pricing_type: 'fixed',
      original_price: 0,
      discount_percentage: 10,
    }
  });

  const isFree = form.watch("is_free");
  const hasCapacityLimit = form.watch("has_capacity_limit");
  const pricingType = form.watch("pricing_type");
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
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "يجب تسجيل الدخول أولاً" : "Please login first", variant: "destructive" });
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
        max_capacity: data.has_capacity_limit ? data.max_capacity : null,
        current_capacity: 0,
        is_free: data.is_free,
        image_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        detail_images: detailImageUrls,
        provided_services: data.provided_services,
        availability_type: data.pricing_type,
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: isRTL ? "تم بنجاح!" : "Success!", description: isRTL ? "تم إنشاء الخدمة المخفضة وإرسالها للمراجعة" : "Discount service created and sent for review" });
      navigate('/manage-services');
    } catch (error) {
      console.error('Error creating discount service:', error);
      toast({ title: isRTL ? "خطأ" : "Error", description: isRTL ? "حدث خطأ أثناء إنشاء الخدمة" : "Error creating service", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" onClick={() => navigate('/create-service')} className="mb-4">
              {isRTL ? '← العودة لاختيار النوع' : '← Back to type selection'}
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? 'إنشاء خدمة مخفضة' : 'Create Discount Service'}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL ? 'قدم خدماتك بأسعار مخفضة لفترة محدودة' : 'Offer your services at discounted prices for a limited time'}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
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
                    {isRTL ? 'فترة الخصم' : 'Discount Period'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? 'تاريخ البدء' : 'Start Date'}</FormLabel>
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
                          <FormLabel>{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</FormLabel>
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
                    {isRTL ? 'الموقع' : 'Location'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? 'الموقع (English)' : 'Location (English)'}</FormLabel>
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
                          <FormLabel>{isRTL ? 'الموقع (العربية)' : 'Location (Arabic)'}</FormLabel>
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

              {/* Capacity Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {isRTL ? 'إعدادات السعة' : 'Capacity Settings'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? 'هل تتأثر هذه الخدمة بعدد الأشخاص الذين يحجزون في نفس الوقت؟'
                      : 'Is this service affected by the number of people booking at the same time?'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="has_capacity_limit"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {isRTL ? 'تحديد حد أقصى للحجوزات المتزامنة' : 'Set maximum concurrent bookings'}
                          </FormLabel>
                          <FormDescription>
                            {isRTL 
                              ? 'إذا كانت الإجابة "لا"، يمكن لأي عدد من المستخدمين الحجز في نفس الوقت'
                              : 'If "No", unlimited users can book the same time slot'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasCapacityLimit && (
                    <FormField
                      control={form.control}
                      name="max_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isRTL ? 'الحد الأقصى للحجوزات المتزامنة' : 'Maximum Concurrent Bookings'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder={isRTL ? "مثال: 3" : "Example: 3"}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            {isRTL 
                              ? 'بعد الوصول لهذا العدد، سيتم حظر الحجز لنفس الوقت تلقائياً'
                              : 'Once this limit is reached, the time slot will be automatically blocked'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {isRTL ? 'التسعير' : 'Pricing'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="is_free"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel className="text-base">{isRTL ? 'خدمة مجانية' : 'Free Service'}</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? 'هل هذه الخدمة مجانية؟' : 'Is this service free?'}
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!isFree && (
                    <>
                      <FormField
                        control={form.control}
                        name="pricing_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isRTL ? 'نوع التسعير' : 'Pricing Type'}</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="grid grid-cols-2 gap-4"
                              >
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <RadioGroupItem value="fixed" id="fixed" />
                                  <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
                                    <DollarSign className="h-4 w-4" />
                                    {isRTL ? 'سعر ثابت' : 'Fixed Price'}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <RadioGroupItem value="per_hour" id="per_hour" />
                                  <Label htmlFor="per_hour" className="flex items-center gap-2 cursor-pointer">
                                    <Clock className="h-4 w-4" />
                                    {isRTL ? 'سعر بالساعة' : 'Hourly Price'}
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="original_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {pricingType === 'per_hour' 
                                  ? (isRTL ? 'السعر الأصلي للساعة (ريال)' : 'Original Hourly Price (SAR)')
                                  : (isRTL ? 'السعر الأصلي (ريال)' : 'Original Price (SAR)')}
                              </FormLabel>
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
                              <FormLabel>{isRTL ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}</FormLabel>
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
                            <span className="text-muted-foreground">
                              {pricingType === 'per_hour' 
                                ? (isRTL ? 'السعر الأصلي للساعة:' : 'Original hourly price:')
                                : (isRTL ? 'السعر الأصلي:' : 'Original price:')}
                            </span>
                            <span className="line-through">{originalPrice.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">{isRTL ? 'نسبة الخصم:' : 'Discount:'}</span>
                            <span className="text-destructive font-bold">-{discountPercentage}%</span>
                          </div>
                          <div className="flex items-center justify-between text-lg font-bold">
                            <span>
                              {pricingType === 'per_hour' 
                                ? (isRTL ? 'السعر بعد الخصم (للساعة):' : 'Discounted price (hourly):')
                                : (isRTL ? 'السعر بعد الخصم:' : 'Discounted price:')}
                            </span>
                            <span className="text-primary">{discountedPrice.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                            <span>{isRTL ? 'الوفر:' : 'You save:'}</span>
                            <span className="text-green-600">{(originalPrice - discountedPrice).toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isRTL ? 'صور الخدمة' : 'Service Images'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceImageUpload form={form} />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting 
                    ? (isRTL ? "جاري الإنشاء..." : "Creating...") 
                    : (isRTL ? "إنشاء الخدمة المخفضة" : "Create Discount Service")}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={() => navigate('/create-service')}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
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