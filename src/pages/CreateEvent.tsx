import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Plus, Upload, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { EventDateTimeDialog, EventSchedule } from '@/components/Events/EventDateTimeDialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const formSchema = z.object({
  eventName: z.string().min(3, 'Event name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  groupId: z.string().min(1, 'Please select a group'),
  location: z.string().min(3, 'Location is required'),
  isPaid: z.enum(['free', 'paid']),
  price: z.number().min(0).optional(),
  totalTickets: z.number().min(1, 'At least 1 ticket required'),
  maxParticipants: z.number().min(1, 'At least 1 participant required'),
});

interface PricingPlan {
  id: string;
  price: number;
  ticketLimit: number;
}

const CreateEvent = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
      description: '',
      groupId: '',
      location: '',
      isPaid: 'free',
      price: 0,
      totalTickets: 50,
      maxParticipants: 50,
    },
  });

  const isPaid = form.watch('isPaid') === 'paid';

  // Load user's groups
  useEffect(() => {
    const loadMyGroups = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('event_groups')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyGroups(data);
      }
    };

    loadMyGroups();
  }, [user]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `event-images/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('event-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل رفع الصور' : 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addPricingPlan = () => {
    setPricingPlans([
      ...pricingPlans,
      { id: Date.now().toString(), price: 0, ticketLimit: 10 },
    ]);
  };

  const removePricingPlan = (id: string) => {
    setPricingPlans(pricingPlans.filter((plan) => plan.id !== id));
  };

  const updatePricingPlan = (id: string, field: 'price' | 'ticketLimit', value: number) => {
    setPricingPlans(
      pricingPlans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
    );
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يجب تسجيل الدخول أولاً' : 'Please login first',
        variant: 'destructive',
      });
      return;
    }

    if (schedules.length === 0) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يرجى تحديد التاريخ والوقت' : 'Please set date and time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert schedules to start/end dates
      const startDate = new Date(schedules[0].date);
      const startHour = parseInt(schedules[0].startTime);
      const adjustedStartHour =
        schedules[0].startPeriod === 'PM' && startHour !== 12
          ? startHour + 12
          : schedules[0].startPeriod === 'AM' && startHour === 12
          ? 0
          : startHour;

      startDate.setHours(adjustedStartHour, 0, 0, 0);

      const lastSchedule = schedules[schedules.length - 1];
      const endDate = new Date(lastSchedule.date);
      const endHour = parseInt(lastSchedule.endTime);
      const adjustedEndHour =
        lastSchedule.endPeriod === 'PM' && endHour !== 12
          ? endHour + 12
          : lastSchedule.endPeriod === 'AM' && endHour === 12
          ? 0
          : endHour;

      endDate.setHours(adjustedEndHour, 0, 0, 0);

      // Set default thumbnail if no images uploaded
      const defaultThumbnail = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800';

      // Insert event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: data.eventName,
          title_ar: data.eventName,
          description: data.description,
          description_ar: data.description,
          location: data.location,
          location_ar: data.location,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          price: isPaid ? data.price || 0 : 0,
          max_attendees: data.maxParticipants,
          organizer_id: user.id,
          image_url: images.length > 0 ? images[0] : defaultThumbnail,
          detail_images: images.slice(1),
          status: 'pending',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Insert event schedules
      const schedulesToInsert = schedules.map((schedule) => {
        const scheduleDate = new Date(schedule.date);
        const startHr = parseInt(schedule.startTime);
        const endHr = parseInt(schedule.endTime);

        const adjustedStartHr =
          schedule.startPeriod === 'PM' && startHr !== 12
            ? startHr + 12
            : schedule.startPeriod === 'AM' && startHr === 12
            ? 0
            : startHr;

        const adjustedEndHr =
          schedule.endPeriod === 'PM' && endHr !== 12
            ? endHr + 12
            : schedule.endPeriod === 'AM' && endHr === 12
            ? 0
            : endHr;

        return {
          event_id: eventData.id,
          schedule_date: scheduleDate.toISOString().split('T')[0],
          start_time: `${adjustedStartHr.toString().padStart(2, '0')}:00:00`,
          end_time: `${adjustedEndHr.toString().padStart(2, '0')}:00:00`,
        };
      });

      const { error: schedulesError } = await supabase
        .from('event_schedules')
        .insert(schedulesToInsert);

      if (schedulesError) throw schedulesError;

      // Insert pricing plans if paid event
      if (isPaid && pricingPlans.length > 0) {
        const plansToInsert = pricingPlans.map((plan) => ({
          event_id: eventData.id,
          plan_name: `${isRTL ? 'خطة' : 'Plan'} - ${plan.price} ${isRTL ? 'ريال' : 'SAR'}`,
          plan_name_ar: `خطة - ${plan.price} ريال`,
          price: plan.price,
          ticket_limit: plan.ticketLimit,
          available_tickets: plan.ticketLimit,
        }));

        const { error: plansError } = await supabase
          .from('pricing_plans')
          .insert(plansToInsert);

        if (plansError) throw plansError;
      }

      // Link event to group
      const { error: groupError } = await supabase
        .from('event_groups')
        .update({ event_id: eventData.id })
        .eq('id', data.groupId);

      if (groupError) throw groupError;

      toast({
        title: isRTL ? 'تم بنجاح' : 'Success',
        description: isRTL ? 'تم إنشاء الفعالية بنجاح' : 'Event created successfully',
      });

      navigate(`/group-details/${data.groupId}`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء إنشاء الفعالية' : 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {isRTL ? 'إضافة فعالية' : 'Add Event'}
            </h1>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="eventName">
                    {isRTL ? 'اسم الفعالية' : 'Event Name'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eventName"
                    placeholder={isRTL ? 'أدخل اسم الفعالية' : 'Enter event name'}
                    {...form.register('eventName')}
                  />
                  {form.formState.errors.eventName && (
                    <p className="text-sm text-destructive">{form.formState.errors.eventName.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {isRTL ? 'الوصف' : 'Description'} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={isRTL ? 'أدخل وصف الفعالية' : 'Enter event description'}
                    rows={4}
                    {...form.register('description')}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                {/* Group Selection */}
                <div className="space-y-2">
                  <Label htmlFor="groupId">
                    {isRTL ? 'المجموعة' : 'Group'} <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={(val) => form.setValue('groupId', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? 'اختر مجموعة' : 'Select a group'} />
                    </SelectTrigger>
                    <SelectContent>
                      {myGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.group_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.groupId && (
                    <p className="text-sm text-destructive">{form.formState.errors.groupId.message}</p>
                  )}
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>{isRTL ? 'صور الفعالية' : 'Event Images'}</Label>
                  <div className="grid grid-cols-4 gap-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <span className="text-sm text-muted-foreground">{isRTL ? 'جاري الرفع...' : 'Uploading...'}</span>
                      ) : (
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      )}
                    </label>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    {isRTL ? 'الموقع' : 'Location'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder={isRTL ? 'أدخل موقع الفعالية' : 'Enter event location'}
                    {...form.register('location')}
                  />
                  {form.formState.errors.location && (
                    <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                  )}
                </div>

                {/* Free or Paid */}
                <div className="space-y-2">
                  <Label>{isRTL ? 'نوع الفعالية' : 'Event Type'}</Label>
                  <RadioGroup
                    value={form.watch('isPaid')}
                    onValueChange={(val) => form.setValue('isPaid', val as 'free' | 'paid')}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="free" id="free" />
                      <Label htmlFor="free" className="cursor-pointer">
                        {isRTL ? 'مجانية' : 'Free'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="paid" id="paid" />
                      <Label htmlFor="paid" className="cursor-pointer">
                        {isRTL ? 'مدفوعة' : 'Paid'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Price (if paid) */}
                {isPaid && (
                  <div className="space-y-2">
                    <Label htmlFor="price">
                      {isRTL ? 'السعر (ريال سعودي)' : 'Price (SAR)'}
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...form.register('price', { valueAsNumber: true })}
                    />
                  </div>
                )}

                {/* Pricing Plans */}
                {isPaid && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{isRTL ? 'خطط الأسعار' : 'Pricing Plans'}</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPricingPlan}>
                        <Plus className="h-4 w-4 ml-1" />
                        {isRTL ? 'إضافة خطة' : 'Add Plan'}
                      </Button>
                    </div>
                    {pricingPlans.map((plan) => (
                      <Card key={plan.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder={isRTL ? 'السعر' : 'Price'}
                            value={plan.price}
                            onChange={(e) => updatePricingPlan(plan.id, 'price', parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder={isRTL ? 'عدد التذاكر' : 'Ticket Limit'}
                            value={plan.ticketLimit}
                            onChange={(e) => updatePricingPlan(plan.id, 'ticketLimit', parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePricingPlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Tickets & Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalTickets">
                      {isRTL ? 'إجمالي التذاكر' : 'Total Tickets'} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="totalTickets"
                      type="number"
                      min="1"
                      {...form.register('totalTickets', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">
                      {isRTL ? 'المشاركين المسموح بهم' : 'Allowed Participants'} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="1"
                      {...form.register('maxParticipants', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Date & Time Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDateDialog(true)}
                >
                  <CalendarIcon className="h-4 w-4 ml-2" />
                  {schedules.length > 0
                    ? `${isRTL ? 'تم تعيين' : 'Set'} ${schedules.length} ${isRTL ? 'يوم' : 'day(s)'}`
                    : isRTL
                    ? 'تحديد التاريخ والوقت'
                    : 'Set Date & Time'}
                </Button>

                {/* Show Schedules */}
                {schedules.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {isRTL ? 'الأيام المحددة:' : 'Selected Days:'}
                    </Label>
                    {schedules.map((schedule, index) => (
                      <div key={index} className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {format(schedule.date, 'PPP', { locale: isRTL ? ar : undefined })} -{' '}
                        {schedule.startTime}:{schedule.startPeriod} {isRTL ? 'إلى' : 'to'} {schedule.endTime}:
                        {schedule.endPeriod}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting
                ? isRTL
                  ? 'جاري الإضافة...'
                  : 'Adding...'
                : isRTL
                ? 'إضافة الفعالية'
                : 'Add Event'}
            </Button>
          </form>
        </div>
      </main>

      <Footer />

      {/* Date Time Dialog */}
      <EventDateTimeDialog
        open={showDateDialog}
        onClose={() => setShowDateDialog(false)}
        onSave={(newSchedules) => setSchedules(newSchedules)}
        initialSchedules={schedules}
      />
    </div>
  );
};

export default CreateEvent;
