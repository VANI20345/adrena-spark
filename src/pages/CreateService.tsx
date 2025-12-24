import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload, MapPin, DollarSign, Image as ImageIcon, Briefcase, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

const formSchema = z.object({
  name: z.string().min(3, "اسم الخدمة يجب أن يكون 3 أحرف على الأقل"),
  nameAr: z.string().min(3, "اسم الخدمة بالعربية يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  descriptionAr: z.string().min(10, "الوصف بالعربية يجب أن يكون 10 أحرف على الأقل"),
  location: z.string().min(3, "الموقع مطلوب"),
  locationAr: z.string().min(3, "الموقع بالعربية مطلوب"),
  mainCategoryId: z.string().min(1, "يجب اختيار القسم الرئيسي"),
  subCategoryId: z.string().optional(),
  customServiceName: z.string().optional(),
  customServiceNameAr: z.string().optional(),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  durationMinutes: z.number().min(1, "المدة يجب أن تكون دقيقة واحدة على الأقل"),
  pricingType: z.enum(['per_hour', 'per_day', 'fixed']).default('fixed'),
  imageUrl: z.string().optional(),
  // Availability settings
  availabilityType: z.enum(['full_day', 'specific_hours']).default('full_day'),
  availableFrom: z.string().default('08:00'),
  availableTo: z.string().default('22:00'),
  bookingDurationMinutes: z.number().min(15, "مدة الحجز يجب أن تكون 15 دقيقة على الأقل").default(60),
});

type FormData = z.infer<typeof formSchema>;

const CreateService = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("");

  // Load all service categories from Supabase
  const { data: allCategories = [] } = useSupabaseQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) {
        console.error('Error fetching service categories:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Split categories into main and subcategories
  const mainCategories = useMemo(() => {
    if (!Array.isArray(allCategories)) return [];
    return allCategories.filter(cat => !cat.parent_id);
  }, [allCategories]);

  const subCategories = useMemo(() => {
    if (!Array.isArray(allCategories) || !selectedMainCategory) return [];
    return allCategories.filter(cat => cat.parent_id === selectedMainCategory);
  }, [allCategories, selectedMainCategory]);

  // Check if "Other" is selected
  const isOtherSelected = useMemo(() => {
    const mainCat = mainCategories.find(cat => cat.id === selectedMainCategory);
    return mainCat?.name === 'Other';
  }, [mainCategories, selectedMainCategory]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      description: "",
      descriptionAr: "",
      location: "",
      locationAr: "",
      mainCategoryId: "",
      subCategoryId: "",
      customServiceName: "",
      customServiceNameAr: "",
      price: 0,
      durationMinutes: 60,
      pricingType: 'fixed' as const,
      imageUrl: "",
      availabilityType: 'full_day' as const,
      availableFrom: '08:00',
      availableTo: '22:00',
      bookingDurationMinutes: 60,
    }
  });

  const availabilityType = form.watch('availabilityType');

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

    // Validate that either subCategory is selected or custom name is provided for "Other"
    if (isOtherSelected && !data.customServiceName) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الخدمة",
        variant: "destructive"
      });
      return;
    }

    if (!isOtherSelected && !data.subCategoryId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار القسم الفرعي",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('services').insert({
        name: isOtherSelected ? data.customServiceName : data.name,
        name_ar: isOtherSelected ? data.customServiceNameAr : data.nameAr,
        description: data.description,
        description_ar: data.descriptionAr,
        location: data.location,
        location_ar: data.locationAr,
        category_id: isOtherSelected ? data.mainCategoryId : data.subCategoryId,
        price: data.price,
        duration_minutes: data.durationMinutes,
        image_url: data.imageUrl,
        provider_id: user.id,
        status: 'pending',
        availability_type: data.availabilityType,
        available_from: data.availableFrom,
        available_to: data.availableTo,
        booking_duration_minutes: data.bookingDurationMinutes,
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح!",
        description: "تم إنشاء الخدمة وإرسالها للمراجعة"
      });

      form.reset();
      setImagePreview(null);
      setSelectedMainCategory("");
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
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pb-32">
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
                    name="mainCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم الرئيسي</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedMainCategory(value);
                            form.setValue('subCategoryId', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القسم الرئيسي" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mainCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name_ar}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Show subcategories if main category is selected and not "Other" */}
                  {selectedMainCategory && !isOtherSelected && subCategories.length > 0 && (
                    <FormField
                      control={form.control}
                      name="subCategoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القسم الفرعي</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر القسم الفرعي" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name_ar}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Show custom name fields if "Other" is selected */}
                  {isOtherSelected && (
                    <>
                      <FormField
                        control={form.control}
                        name="customServiceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم الخدمة المخصص (English)</FormLabel>
                            <FormControl>
                              <Input placeholder="Custom Service Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customServiceNameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم الخدمة المخصص (العربية)</FormLabel>
                            <FormControl>
                              <Input placeholder="اسم الخدمة المخصص" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
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

              {/* Availability Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    إعدادات التوفر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="availabilityType"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">نوع التوفر</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            {field.value === 'full_day' ? 'الخدمة متاحة طوال اليوم (24 ساعة)' : 'الخدمة متاحة في ساعات محددة'}
                          </div>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">24 ساعة</span>
                            <Switch
                              checked={field.value === 'specific_hours'}
                              onCheckedChange={(checked) => 
                                field.onChange(checked ? 'specific_hours' : 'full_day')
                              }
                            />
                            <span className="text-sm">ساعات محددة</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {availabilityType === 'specific_hours' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="availableFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>من الساعة</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="availableTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>إلى الساعة</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="bookingDurationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مدة كل حجز (بالدقائق)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر مدة الحجز" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 دقيقة</SelectItem>
                            <SelectItem value="60">ساعة واحدة</SelectItem>
                            <SelectItem value="90">ساعة ونصف</SelectItem>
                            <SelectItem value="120">ساعتين</SelectItem>
                            <SelectItem value="180">3 ساعات</SelectItem>
                            <SelectItem value="240">4 ساعات</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

            </form>
          </Form>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
          <div className="container mx-auto max-w-4xl">
            <div className="flex gap-4">
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting} 
                className="flex-1"
                onClick={form.handleSubmit(onSubmit)}
              >
                {isSubmitting ? "جاري الإنشاء..." : "إنشاء الخدمة"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                onClick={() => form.reset()}
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateService;