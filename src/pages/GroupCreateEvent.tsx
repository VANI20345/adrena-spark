import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Calendar as CalendarIcon, Trash2, Crown, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  allowedParticipants: z.number().min(1, 'At least 1 participant required'),
  interests: z.array(z.string()).min(1, 'Please select at least one interest'),
});

interface PricingPlan {
  id: string;
  price: number;
  ticketLimit: number;
}

const GroupCreateEvent = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRTL = language === 'ar';

  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [groupAdmins, setGroupAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
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
      groupId: searchParams.get('groupId') || '',
      location: '',
      isPaid: 'free',
      price: 0,
      allowedParticipants: 50,
      interests: [],
    },
  });

  const isPaid = form.watch('isPaid') === 'paid';

  // Load user's groups where they are the owner or admin
  useEffect(() => {
    const loadMyGroups = async () => {
      if (!user) return;

      // Get groups where user is owner
      const { data: ownedGroups } = await supabase
        .from('event_groups')
        .select('*')
        .eq('created_by', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      // Get groups where user is admin
      const { data: adminMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner']);

      const adminGroupIds = adminMemberships?.map(m => m.group_id) || [];
      
      // Fetch admin groups details
      let adminGroups: any[] = [];
      if (adminGroupIds.length > 0) {
        const { data } = await supabase
          .from('event_groups')
          .select('*')
          .in('id', adminGroupIds)
          .is('archived_at', null);
        adminGroups = data || [];
      }

      // Merge and deduplicate
      const allGroups = [...(ownedGroups || [])];
      adminGroups.forEach(g => {
        if (!allGroups.find(og => og.id === g.id)) {
          allGroups.push(g);
        }
      });

      setMyGroups(allGroups);
    };

    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar')
        .order('name_ar');

      if (!error && data) {
        setCategories(data);
      }
    };

    loadMyGroups();
    loadCategories();
  }, [user]);

  // Load group admins when group is selected
  useEffect(() => {
    const loadGroupAdmins = async () => {
      const groupId = form.watch('groupId');
      if (!groupId) {
        setGroupAdmins([]);
        return;
      }

      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId)
        .in('role', ['admin', 'owner']);

      if (members) {
        const adminsWithProfiles = await Promise.all(
          members.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', member.user_id)
              .single();

            return {
              user_id: member.user_id,
              role: member.role,
              full_name: profile?.full_name || 'مستخدم',
              avatar_url: profile?.avatar_url
            };
          })
        );
        setGroupAdmins(adminsWithProfiles);
        
        // Auto-select first admin (owner) if available
        if (adminsWithProfiles.length > 0 && !selectedAdmin) {
          const owner = adminsWithProfiles.find(a => a.role === 'owner');
          setSelectedAdmin(owner?.user_id || adminsWithProfiles[0].user_id);
        }
      }
    };

    loadGroupAdmins();
  }, [form.watch('groupId')]);

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}-thumbnail.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setThumbnail(publicUrl);
      
      toast({
        title: isRTL ? 'تم' : 'Success',
        description: isRTL ? 'تم رفع الصورة المصغرة بنجاح' : 'Thumbnail uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل رفع الصورة المصغرة' : 'Failed to upload thumbnail',
        variant: 'destructive',
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `event-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
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
      
      toast({
        title: isRTL ? 'تم' : 'Success',
        description: isRTL ? 'تم رفع الصور بنجاح' : 'Images uploaded successfully',
      });
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

    if (isPaid && (!data.price || data.price <= 0)) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'يرجى إدخال السعر' : 'Please enter price',
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

      // Set default thumbnail if no thumbnail uploaded
      const defaultThumbnail = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800';
      const eventThumbnail = thumbnail || defaultThumbnail;
      
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
          max_attendees: data.allowedParticipants,
          organizer_id: selectedAdmin || user.id,
          group_id: data.groupId,
          image_url: eventThumbnail,
          detail_images: images,
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
          day_description: schedule.description || null,
        };
      });

      const { error: schedulesError } = await supabase
        .from('event_schedules')
        .insert(schedulesToInsert);

      if (schedulesError) throw schedulesError;

      // Insert event interests
      if (data.interests && data.interests.length > 0) {
        const interestsToInsert = data.interests.map((interestId) => ({
          event_id: eventData.id,
          interest_id: interestId,
        }));

        const { error: interestsError } = await supabase
          .from('event_interests')
          .insert(interestsToInsert);

        if (interestsError) throw interestsError;
      }

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

      // Note: Event is now linked to group via group_id column in events table
      // No need to update event_groups table

      toast({
        title: isRTL ? 'تم بنجاح' : 'Success',
        description: isRTL ? 'تم إنشاء الفعالية بنجاح' : 'Event created successfully',
      });

      navigate(`/groups/${data.groupId}`);
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
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
                  <Select 
                    value={form.watch('groupId')}
                    onValueChange={(val) => form.setValue('groupId', val)}
                  >
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

                {/* Event Admin Selection */}
                {form.watch('groupId') && groupAdmins.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      {isRTL ? 'مسؤول الفعالية' : 'Event Admin'} <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {isRTL ? 'اختر المسؤول عن إدارة هذه الفعالية' : 'Select admin responsible for this event'}
                    </p>
                    <Select 
                      value={selectedAdmin}
                      onValueChange={setSelectedAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isRTL ? 'اختر مسؤول' : 'Select admin'} />
                      </SelectTrigger>
                      <SelectContent>
                        {groupAdmins.map((admin) => (
                          <SelectItem key={admin.user_id} value={admin.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={admin.avatar_url} />
                                <AvatarFallback className="text-xs">{admin.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{admin.full_name}</span>
                              {admin.role === 'owner' ? (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Shield className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Event Thumbnail */}
                <div className="space-y-3">
                  <Label>
                    {isRTL ? 'الصورة المصغرة للفعالية' : 'Event Thumbnail'}
                    <span className="text-muted-foreground text-xs ml-2">
                      {isRTL ? '(ستظهر في بطاقة الفعالية)' : '(Will appear on event card)'}
                    </span>
                  </Label>
                  
                  {thumbnail ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-border group">
                      <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setThumbnail('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                        disabled={uploadingThumbnail}
                      />
                      {uploadingThumbnail ? (
                        <span className="text-sm text-muted-foreground">{isRTL ? 'جاري الرفع...' : 'Uploading...'}</span>
                      ) : (
                        <>
                          <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm font-medium">{isRTL ? 'رفع صورة مصغرة' : 'Upload Thumbnail'}</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* Event Detail Images */}
                <div className="space-y-3">
                  <Label>
                    {isRTL ? 'صور تفاصيل الفعالية' : 'Event Detail Images'}
                    <span className="text-muted-foreground text-xs ml-2">
                      {isRTL ? '(اختياري - صور إضافية للفعالية)' : '(Optional - Additional event images)'}
                    </span>
                  </Label>
                  
                  {/* Upload Button */}
                  <div>
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors">
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
                        <>
                          <Plus className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{isRTL ? 'رفع صور' : 'Upload Images'}</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Images Preview - Horizontal Row */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {images.map((img, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-border group">
                          <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                <div className="space-y-3">
                  <Label>{isRTL ? 'مجاني / مدفوع' : 'Free / Paid'}</Label>
                  <RadioGroup
                    value={form.watch('isPaid')}
                    onValueChange={(val) => form.setValue('isPaid', val as 'free' | 'paid')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="free" id="free" />
                      <Label htmlFor="free" className="cursor-pointer font-normal">
                        {isRTL ? 'مجاني' : 'Free'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="paid" id="paid" />
                      <Label htmlFor="paid" className="cursor-pointer font-normal">
                        {isRTL ? 'مدفوع' : 'Paid'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Price (if paid) - Shows when Paid is selected */}
                {isPaid && (
                  <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                    <Label htmlFor="price">
                      {isRTL ? 'السعر (ريال سعودي)' : 'Price (SAR)'} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      {...form.register('price', { valueAsNumber: true })}
                    />
                    {form.formState.errors.price && (
                      <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                    )}
                  </div>
                )}

                {/* Add Pricing Plan (optional) - Only for paid events */}
                {isPaid && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{isRTL ? 'خطط التسعير (اختياري)' : 'Add Pricing Plan (optional)'}</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPricingPlan}>
                        <Plus className="h-4 w-4 mr-2" />
                        {isRTL ? 'إضافة خطة' : 'Add Plan'}
                      </Button>
                    </div>
                    
                    {pricingPlans.length > 0 && (
                      <div className="space-y-3">
                        {pricingPlans.map((plan) => (
                          <Card key={plan.id} className="p-4 bg-muted/50">
                            <div className="flex items-end gap-3">
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">{isRTL ? 'السعر' : 'Price'}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={plan.price}
                                  onChange={(e) =>
                                    updatePricingPlan(plan.id, 'price', parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">{isRTL ? 'حد التذاكر' : 'Ticket Limit'}</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={plan.ticketLimit}
                                  onChange={(e) =>
                                    updatePricingPlan(plan.id, 'ticketLimit', parseInt(e.target.value) || 1)
                                  }
                                  placeholder="10"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removePricingPlan(plan.id)}
                                className="shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Event Interests */}
                <div className="space-y-3">
                  <Label>
                    {isRTL ? 'اهتمامات الفعالية' : 'Event Interests'} <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`interest-${category.id}`}
                          checked={form.watch('interests')?.includes(category.id)}
                          onCheckedChange={(checked) => {
                            const current = form.watch('interests') || [];
                            if (checked) {
                              form.setValue('interests', [...current, category.id]);
                            } else {
                              form.setValue('interests', current.filter(id => id !== category.id));
                            }
                          }}
                        />
                        <Label htmlFor={`interest-${category.id}`} className="cursor-pointer font-normal">
                          {isRTL ? category.name_ar : category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.interests && (
                    <p className="text-sm text-destructive">{form.formState.errors.interests.message}</p>
                  )}
                </div>

                {/* Allowed Participants */}
                <div className="space-y-2">
                  <Label htmlFor="allowedParticipants">
                    {isRTL ? 'المشاركون المسموح لهم' : 'Allowed Participants'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="allowedParticipants"
                    type="number"
                    min="1"
                    {...form.register('allowedParticipants', { valueAsNumber: true })}
                  />
                  {form.formState.errors.allowedParticipants && (
                    <p className="text-sm text-destructive">{form.formState.errors.allowedParticipants.message}</p>
                  )}
                </div>

                {/* Set Date & Time Button */}
                <div className="space-y-3">
                  <Label>
                    {isRTL ? 'التاريخ والوقت' : 'Date & Time'} <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant={schedules.length > 0 ? "default" : "outline"}
                    onClick={() => setShowDateDialog(true)}
                    className="w-full justify-start h-auto py-3"
                  >
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {schedules.length === 0 
                          ? (isRTL ? 'تحديد التاريخ والوقت' : 'Set Date & Time')
                          : (isRTL ? `تم تحديد ${schedules.length} يوم` : `${schedules.length} day(s) scheduled`)
                        }
                      </span>
                      {schedules.length > 0 && (
                        <span className="text-xs opacity-70">
                          {format(schedules[0].date, 'PPP', { locale: isRTL ? ar : undefined })}
                        </span>
                      )}
                    </div>
                  </Button>
                  
                  {/* Show all scheduled days */}
                  {schedules.length > 0 && (
                    <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-2 border">
                      <p className="text-sm font-semibold mb-2">
                        {isRTL ? 'الأيام المحددة:' : 'Scheduled Days:'}
                      </p>
                      {schedules.map((schedule, idx) => (
                        <div key={idx} className="text-sm flex items-center justify-between py-2 px-3 bg-background rounded border">
                          <div>
                            <span className="font-medium">
                              {format(schedule.date, 'PPP', { locale: isRTL ? ar : undefined })}
                            </span>
                            <span className="mx-2 text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {schedule.startTime}:{schedule.startPeriod} {isRTL ? 'إلى' : 'to'}{' '}
                              {schedule.endTime}:{schedule.endPeriod}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold" 
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? (isRTL ? 'جاري الإنشاء...' : 'Creating...')
                    : (isRTL ? 'إضافة فعالية' : 'Add Event')
                  }
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>

      <Footer />

      {/* Date Time Dialog */}
      <EventDateTimeDialog
        open={showDateDialog}
        onClose={() => setShowDateDialog(false)}
        onSave={(newSchedules) => {
          setSchedules(newSchedules);
          setShowDateDialog(false);
        }}
        initialSchedules={schedules}
      />
    </div>
  );
};

export default GroupCreateEvent;
