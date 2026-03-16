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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, MapPin, Users, Clock, DollarSign, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";

const formSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  titleAr: z.string().min(3, "العنوان بالعربية يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  descriptionAr: z.string().min(10, "الوصف بالعربية يجب أن يكون 10 أحرف على الأقل"),
  location: z.string().min(3, "الموقع مطلوب"),
  locationAr: z.string().min(3, "الموقع بالعربية مطلوب"),
  categoryId: z.string().min(1, "يجب اختيار فئة"),
  startDate: z.date({
    required_error: "تاريخ البداية مطلوب",
  }),
  endDate: z.date({
    required_error: "تاريخ النهاية مطلوب",
  }),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  maxAttendees: z.number().min(1, "عدد المشاركين يجب أن يكون 1 على الأقل"),
  pointsRequired: z.number().min(0, "النقاط المطلوبة يجب أن تكون 0 أو أكثر"),
  featured: z.boolean().default(false),
  imageUrl: z.string().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  path: ["endDate"]
});

type FormData = z.infer<typeof formSchema>;

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguageContext();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      titleAr: "",
      description: "",
      descriptionAr: "",
      location: "",
      locationAr: "",
      categoryId: "",
      price: 0,
      maxAttendees: 50,
      pointsRequired: 0,
      featured: false,
      imageUrl: "",
    },
  });

  // Fetch categories
  const { data: categories } = useSupabaseQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch event data
  const { data: event, isLoading: eventLoading } = useSupabaseQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) throw new Error('Event ID required');
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          categories(name, name_ar)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Event not found');
      return data;
    },
    enabled: !!id,
    onSuccess: (eventData) => {
      // Populate form with existing data
      form.reset({
        title: eventData.title || "",
        titleAr: eventData.title_ar || "",
        description: eventData.description || "",
        descriptionAr: eventData.description_ar || "",
        location: eventData.location || "",
        locationAr: eventData.location_ar || "",
        categoryId: eventData.category_id || "",
        startDate: eventData.start_date ? new Date(eventData.start_date) : new Date(),
        endDate: eventData.end_date ? new Date(eventData.end_date) : new Date(),
        price: eventData.price || 0,
        maxAttendees: eventData.max_attendees || 50,
        pointsRequired: eventData.points_required || 0,
        featured: eventData.featured || false,
        imageUrl: eventData.image_url || "",
      });
      
      if (eventData.image_url) {
        setImagePreview(eventData.image_url);
      }
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue('imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !id) return;

    // Check if event has already started
    if (event && new Date(event.start_date) < new Date()) {
      toast({
        title: t('error', 'خطأ'),
        description: 'لا يمكن تعديل فعالية قد بدأت بالفعل',
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: data.title,
          title_ar: data.titleAr,
          description: data.description,
          description_ar: data.descriptionAr,
          location: data.location,
          location_ar: data.locationAr,
          category_id: data.categoryId,
          start_date: data.startDate.toISOString(),
          end_date: data.endDate.toISOString(),
          price: data.price,
          max_attendees: data.maxAttendees,
          points_required: data.pointsRequired,
          featured: data.featured,
          image_url: data.imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organizer_id', user.id);

      if (error) throw error;

      toast({
        title: t('success', 'تم بنجاح!'),
        description: t('eventUpdatedSuccess', 'تم تحديث الفعالية بنجاح')
      });

      navigate('/manage-events');
    } catch (error: any) {
      toast({
        title: t('error', 'خطأ'),
        description: error.message || t('eventUpdateError', 'حدث خطأ أثناء تحديث الفعالية'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || eventLoading) {
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

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">الفعالية غير موجودة</h2>
              <p className="text-muted-foreground mb-4">لم يتم العثور على الفعالية المطلوبة</p>
              <Button onClick={() => navigate('/manage-events')}>
                العودة إلى إدارة الفعاليات
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/manage-events')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة
            </Button>
            <div>
              <h1 className="text-3xl font-bold">تعديل الفعالية</h1>
              <p className="text-muted-foreground">قم بتعديل تفاصيل الفعالية</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان الفعالية (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Event title in English" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="titleAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان الفعالية (العربية)</FormLabel>
                          <FormControl>
                            <Input placeholder="عنوان الفعالية بالعربية" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوصف (English)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Event description in English" 
                              className="min-h-[100px]" 
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
                          <FormLabel>الوصف (العربية)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="وصف الفعالية بالعربية" 
                              className="min-h-[100px]" 
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
                        <FormLabel>الفئة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر فئة الفعالية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {language === 'ar' ? category.name_ar : category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <label className="text-sm font-medium">صورة الفعالية</label>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                      </div>
                    </div>
                    {imagePreview && (
                      <div className="mt-4">
                        <img
                          src={imagePreview}
                          alt="معاينة الصورة"
                          className="w-full max-w-md h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    الموقع والتوقيت
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموقع (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Event location in English" {...field} />
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
                            <Input placeholder="موقع الفعالية بالعربية" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاريخ البداية</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-right font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ar })
                                  ) : (
                                    <span>اختر التاريخ</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاريخ النهاية</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ar })
                                  ) : (
                                    <span>اختر التاريخ</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                    <DollarSign className="h-5 w-5" />
                    السعر والحضور
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر (ريال سعودي)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxAttendees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الحد الأقصى للمشاركين</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pointsRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>النقاط المطلوبة</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">فعالية مميزة</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            ستظهر الفعالية في قسم الفعاليات المميزة
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/manage-events')}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "جاري التحديث..." : "تحديث الفعالية"}
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

export default EditEvent;