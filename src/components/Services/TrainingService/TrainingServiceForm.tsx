import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import ServiceBasicInfo from "../Shared/ServiceBasicInfo";
import ServiceImageUpload from "../Shared/ServiceImageUpload";
import TrainingSetsScheduler from "./TrainingSetsScheduler";
import { GraduationCap, Calendar, MapPin, Users, Clock, DollarSign } from "lucide-react";

const trainingServiceSchema = z.object({
  name: z.string().min(3, "اسم التدريب يجب أن يكون 3 أحرف على الأقل"),
  name_ar: z.string().min(3, "اسم التدريب بالعربية يجب أن يكون 3 أحرف على الأقل"),
  trainer_name: z.string().min(3, "اسم المدرب مطلوب"),
  description: z.string().min(200, "الوصف يجب أن يكون 200 حرف على الأقل"),
  description_ar: z.string().min(200, "الوصف بالعربية يجب أن يكون 200 حرف على الأقل"),
  training_level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: "يجب اختيار مستوى التدريب"
  }),
  start_date: z.string().min(1, "تاريخ البدء مطلوب"),
  max_capacity: z.number().min(1, "يجب إدخال عدد صحيح"),
  city_id: z.string().min(1, "يجب اختيار المدينة"),
  location: z.string().min(3, "الموقع مطلوب"),
  location_ar: z.string().min(3, "الموقع بالعربية مطلوب"),
  duration_per_set: z.string().min(1, "يجب اختيار المدة"),
  number_of_sets: z.number().min(1, "يجب إدخال عدد صحيح"),
  is_free: z.boolean(),
  price: z.number().optional(),
}).refine(
  (data) => data.is_free || (data.price && data.price > 0),
  { message: "السعر مطلوب للخدمات المدفوعة", path: ["price"] }
);

type FormData = z.infer<typeof trainingServiceSchema>;

interface TrainingSet {
  date: string;
  start_time: string;
  end_time: string;
  available_spots: number;
}

const TrainingServiceForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainingSets, setTrainingSets] = useState<TrainingSet[]>([]);

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

  // Ensure cities is always an array
  const cityList = cities || [];

  const form = useForm<FormData>({
    resolver: zodResolver(trainingServiceSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      trainer_name: "",
      description: "",
      description_ar: "",
      training_level: 'beginner',
      start_date: "",
      max_capacity: 1,
      city_id: "",
      location: "",
      location_ar: "",
      duration_per_set: "",
      number_of_sets: 1,
      is_free: false,
      price: 0,
    }
  });

  const isFree = form.watch("is_free");

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

    if (trainingSets.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة مواعيد التدريب", variant: "destructive" });
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

      const finalPrice = data.is_free ? 0 : data.price || 0;

      const { data: service, error } = await supabase.from('services').insert({
        provider_id: user.id,
        service_type: 'training',
        name: data.name,
        name_ar: data.name_ar,
        description: data.description,
        description_ar: data.description_ar,
        location: data.location,
        location_ar: data.location_ar,
        price: finalPrice,
        trainer_name: data.trainer_name,
        training_level: data.training_level,
        start_date: data.start_date,
        max_capacity: data.max_capacity,
        current_capacity: 0,
        duration_per_set: parseInt(data.duration_per_set),
        number_of_sets: data.number_of_sets,
        city_id: data.city_id,
        is_free: data.is_free,
        image_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        detail_images: detailImageUrls,
        status: 'pending'
      }).select().single();

      if (error) throw error;

      // Insert training sets
      const { error: setsError } = await supabase.from('training_sets').insert(
        trainingSets.map(set => ({
          service_id: service.id,
          set_date: set.date,
          start_time: set.start_time,
          end_time: set.end_time,
          available_spots: set.available_spots,
        }))
      );

      if (setsError) throw setsError;

      toast({ title: "تم بنجاح!", description: "تم إنشاء التدريب وإرساله للمراجعة" });
      navigate('/manage-services');
    } catch (error) {
      console.error('Error creating training service:', error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء إنشاء التدريب", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const levelLabels: Record<string, string> = {
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم"
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
              إنشاء تدريب
            </h1>
            <p className="text-lg text-muted-foreground">
              قدم تدريبات احترافية للمغامرين
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ServiceBasicInfo form={form} showTrainerName={true} />
                  
                  <FormField
                    control={form.control}
                    name="training_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right block">مستوى التدريب</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-right" dir="rtl">
                              <SelectValue placeholder="اختر المستوى" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="text-right" dir="rtl">
                            <SelectItem value="beginner">مبتدئ (Beginner)</SelectItem>
                            <SelectItem value="intermediate">متوسط (Intermediate)</SelectItem>
                            <SelectItem value="advanced">متقدم (Advanced)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    التاريخ والسعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ بدء التدريب</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الحد الأقصى للمتدربين</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="20"
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    الموقع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="city_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right block">المدينة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-right" dir="rtl">
                              <SelectValue placeholder="اختر المدينة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="text-right" dir="rtl">
                            {cityList.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Location Address" {...field} />
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
                          <FormLabel>العنوان (العربية)</FormLabel>
                          <FormControl>
                            <Input placeholder="حي النخيل - شارع الملك فهد" {...field} />
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
                    <Clock className="w-5 h-5" />
                    مدة وعدد الجلسات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="duration_per_set"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right block">المدة لكل جلسة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue placeholder="اختر المدة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="text-right" dir="rtl">
                              <SelectItem value="30">30 دقيقة</SelectItem>
                              <SelectItem value="60">ساعة واحدة</SelectItem>
                              <SelectItem value="90">ساعة ونصف</SelectItem>
                              <SelectItem value="120">ساعتان</SelectItem>
                              <SelectItem value="180">3 ساعات</SelectItem>
                              <SelectItem value="240">4 ساعات</SelectItem>
                              <SelectItem value="300">5 ساعات</SelectItem>
                              <SelectItem value="360">6 ساعات</SelectItem>
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
                          <FormLabel>عدد الجلسات</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="10"
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    جدول مواعيد التدريب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrainingSetsScheduler 
                    trainingSets={trainingSets}
                    setTrainingSets={setTrainingSets}
                    maxCapacity={form.watch("max_capacity")}
                    durationPerSet={parseInt(form.watch("duration_per_set") || "0")}
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
                          <FormLabel className="text-base">تدريب مجاني</FormLabel>
                          <p className="text-sm text-muted-foreground">هل هذا التدريب مجاني؟</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!isFree && (
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر للشخص (ريال)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01"
                              placeholder="500"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>صور التدريب</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceImageUpload form={form} />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء التدريب"}
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

export default TrainingServiceForm;