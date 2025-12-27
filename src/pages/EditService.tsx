import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Package, Calendar, MapPin, Users, Clock, DollarSign, Percent, GraduationCap } from "lucide-react";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import ServiceBasicInfo from "@/components/Services/Shared/ServiceBasicInfo";
import ProvidedServicesSelector from "@/components/Services/Shared/ProvidedServicesSelector";
import ServiceImageUpload from "@/components/Services/Shared/ServiceImageUpload";

const serviceSchema = z.object({
  name: z.string().min(3, "اسم الخدمة يجب أن يكون 3 أحرف على الأقل"),
  name_ar: z.string().min(3, "اسم الخدمة بالعربية يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(200, "الوصف يجب أن يكون 200 حرف على الأقل"),
  description_ar: z.string().min(200, "الوصف بالعربية يجب أن يكون 200 حرف على الأقل"),
  location: z.string().min(3, "الموقع مطلوب"),
  location_ar: z.string().min(3, "الموقع بالعربية مطلوب"),
  is_free: z.boolean(),
  original_price: z.number().optional(),
  discount_percentage: z.number().optional(),
  price: z.number().optional(),
  trainer_name: z.string().optional(),
  training_level: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  max_capacity: z.number().optional(),
  duration_per_set: z.string().optional(),
  number_of_sets: z.number().optional(),
  city_id: z.string().optional(),
  provided_services: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof serviceSchema>;

const EditService = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguageContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      location: "",
      location_ar: "",
      is_free: false,
      original_price: 0,
      discount_percentage: 0,
      max_capacity: 1,
      provided_services: [],
    },
  });

  // Fetch cities for training services
  const { data: cities } = useSupabaseQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch service data
  const { data: service, isLoading: serviceLoading } = useSupabaseQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      if (!id) throw new Error('Service ID required');
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Service not found');
      return data;
    },
    enabled: !!id,
    onSuccess: (serviceData) => {
      // Check authorization
      if (serviceData.provider_id !== user?.id) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'غير مصرح لك بتعديل هذه الخدمة' : 'You are not authorized to edit this service',
          variant: 'destructive',
        });
        navigate('/manage-services');
        return;
      }

      // Populate form with existing data
      form.reset({
        name: serviceData.name || "",
        name_ar: serviceData.name_ar || "",
        description: serviceData.description || "",
        description_ar: serviceData.description_ar || "",
        location: serviceData.location || "",
        location_ar: serviceData.location_ar || "",
        is_free: serviceData.is_free || false,
        original_price: serviceData.original_price || 0,
        discount_percentage: serviceData.discount_percentage || 0,
        price: serviceData.price || 0,
        trainer_name: serviceData.trainer_name || "",
        training_level: serviceData.training_level || "",
        start_date: serviceData.start_date || "",
        end_date: serviceData.end_date || "",
        max_capacity: serviceData.max_capacity || 1,
        duration_per_set: serviceData.duration_per_set?.toString() || "",
        number_of_sets: serviceData.number_of_sets || 1,
        city_id: serviceData.city_id || "",
        provided_services: serviceData.provided_services || [],
      });
      
      if (serviceData.image_url) {
        setImagePreview(serviceData.image_url);
      }
    }
  });

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
    if (!user || !id) return;

    setIsSubmitting(true);
    try {
      let thumbnailUrl = service?.image_url;
      let detailImageUrls = service?.detail_images || [];

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

      // Calculate final price based on service type
      let finalPrice = data.price || 0;
      if (service?.service_type === 'discount' || service?.service_type === 'other') {
        finalPrice = data.is_free ? 0 : (data.original_price || 0) * (1 - (data.discount_percentage || 0) / 100);
      }

      const { error } = await supabase
        .from('services')
        .update({
          name: data.name,
          name_ar: data.name_ar,
          description: data.description,
          description_ar: data.description_ar,
          location: data.location,
          location_ar: data.location_ar,
          is_free: data.is_free,
          original_price: data.original_price,
          discount_percentage: data.discount_percentage,
          price: finalPrice,
          trainer_name: data.trainer_name,
          training_level: data.training_level,
          start_date: data.start_date,
          end_date: data.end_date,
          max_capacity: data.max_capacity,
          duration_per_set: data.duration_per_set ? parseInt(data.duration_per_set) : null,
          number_of_sets: data.number_of_sets,
          city_id: data.city_id,
          provided_services: data.provided_services,
          image_url: thumbnailUrl,
          thumbnail_url: thumbnailUrl,
          detail_images: detailImageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('provider_id', user.id);

      if (error) throw error;

      toast({
        title: t('success', 'تم بنجاح!'),
        description: language === 'ar' ? 'تم تحديث الخدمة بنجاح' : 'Service updated successfully'
      });

      navigate('/manage-services');
    } catch (error: any) {
      toast({
        title: t('error', 'خطأ'),
        description: error.message || (language === 'ar' ? 'حدث خطأ أثناء تحديث الخدمة' : 'Error updating service'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || serviceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">
                {language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {language === 'ar' ? 'لم يتم العثور على الخدمة المطلوبة' : 'The requested service was not found'}
              </p>
              <Button onClick={() => navigate('/manage-services')}>
                {language === 'ar' ? 'العودة إلى إدارة الخدمات' : 'Back to Manage Services'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const isFree = form.watch("is_free");
  const originalPrice = form.watch("original_price") || 0;
  const discountPercentage = form.watch("discount_percentage") || 0;
  const discountedPrice = originalPrice * (1 - discountPercentage / 100);
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/manage-services')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isRTL ? 'العودة' : 'Back'}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isRTL ? 'تعديل الخدمة' : 'Edit Service'}
              </h1>
              <p className="text-muted-foreground">
                {isRTL ? 'قم بتعديل تفاصيل الخدمة' : 'Update your service details'}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {service.service_type === 'training' && <GraduationCap className="h-5 w-5" />}
                    {service.service_type === 'discount' && <Percent className="h-5 w-5" />}
                    {service.service_type === 'other' && <Package className="h-5 w-5" />}
                    {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ServiceBasicInfo form={form} showTrainerName={service.service_type === 'training'} />
                  
                  {service.service_type === 'training' && (
                    <FormField
                      control={form.control}
                      name="training_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? 'مستوى التدريب' : 'Training Level'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isRTL ? 'اختر المستوى' : 'Select level'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">{isRTL ? 'مبتدئ' : 'Beginner'}</SelectItem>
                              <SelectItem value="intermediate">{isRTL ? 'متوسط' : 'Intermediate'}</SelectItem>
                              <SelectItem value="advanced">{isRTL ? 'متقدم' : 'Advanced'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(service.service_type === 'discount' || service.service_type === 'other') && (
                    <ProvidedServicesSelector form={form} />
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              {(service.service_type === 'discount' || service.service_type === 'other' || service.service_type === 'training') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {isRTL ? 'التواريخ' : 'Dates'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isRTL ? 'تاريخ البدء' : 'Start Date'}</FormLabel>
                            <FormControl>
                              <Input type={service.service_type === 'training' ? 'date' : 'datetime-local'} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {service.service_type !== 'training' && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {isRTL ? 'الموقع' : 'Location'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {service.service_type === 'training' && (
                    <FormField
                      control={form.control}
                      name="city_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? 'المدينة' : 'City'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cities?.map((city) => (
                                <SelectItem key={city.id} value={city.id}>
                                  {isRTL ? city.name_ar : city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Input placeholder="الموقع" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Capacity & Duration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {isRTL ? 'السعة والمدة' : 'Capacity & Duration'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="max_capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? 'الحد الأقصى' : 'Max Capacity'}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {service.service_type === 'training' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="duration_per_set"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isRTL ? 'المدة لكل جلسة' : 'Duration per Set'}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isRTL ? 'اختر المدة' : 'Select duration'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="30">30 {isRTL ? 'دقيقة' : 'minutes'}</SelectItem>
                                <SelectItem value="60">1 {isRTL ? 'ساعة' : 'hour'}</SelectItem>
                                <SelectItem value="90">1.5 {isRTL ? 'ساعة' : 'hours'}</SelectItem>
                                <SelectItem value="120">2 {isRTL ? 'ساعات' : 'hours'}</SelectItem>
                                <SelectItem value="180">3 {isRTL ? 'ساعات' : 'hours'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="number_of_sets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isRTL ? 'عدد الجلسات' : 'Number of Sets'}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {isRTL ? 'التسعير' : 'Pricing'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="is_free"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel className="text-base">
                            {isRTL ? 'خدمة مجانية' : 'Free Service'}
                          </FormLabel>
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
                      {service.service_type === 'training' ? (
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isRTL ? 'السعر (ريال)' : 'Price (SAR)'}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="original_price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{isRTL ? 'السعر الأصلي (ريال)' : 'Original Price (SAR)'}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      step="0.01"
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
                                  <FormLabel>{isRTL ? 'نسبة الخصم (%)' : 'Discount (%)'}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      max="99"
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
                                  {isRTL ? 'السعر الأصلي:' : 'Original Price:'}
                                </span>
                                <span className="line-through">{originalPrice.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}</span>
                              </div>
                              <div className="flex items-center justify-between text-lg font-bold">
                                <span>{isRTL ? 'السعر بعد الخصم:' : 'Discounted Price:'}</span>
                                <span className="text-primary">{discountedPrice.toFixed(2)} {isRTL ? 'ر.س' : 'SAR'}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle>{isRTL ? 'صور الخدمة' : 'Service Images'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceImageUpload form={form} />
                  {imagePreview && (
                    <div className="mt-4">
                      <img
                        src={imagePreview}
                        alt="Current service image"
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث الخدمة' : 'Update Service')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate('/manage-services')}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default EditService;
