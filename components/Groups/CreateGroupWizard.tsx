import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateGroupWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Form schema
const formSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name must be at least 3 characters' }),
  description: z.string().max(200, { message: 'Description must be less than 200 characters' }).optional(),
  interests: z.array(z.string()).min(1, { message: 'At least one interest is required' }),
  joinMethod: z.enum(['open', 'request'], { required_error: 'Please select a join method' }),
  city: z.string().min(1, { message: 'City is required' }),
  memberType: z.enum(['all', 'male', 'female'], { required_error: 'Please select member type' }),
  locationRestriction: z.string().optional(),
  ageRestricted: z.boolean().default(false),
  minAge: z.number().min(13).max(100).optional(),
  maxAge: z.number().min(13).max(100).optional(),
  equipment: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  admissionQuestions: z.array(z.string()).optional(),
}).refine(data => {
  if (data.ageRestricted && data.minAge && data.maxAge) {
    return data.minAge <= data.maxAge;
  }
  return true;
}, {
  message: 'Minimum age must be less than or equal to maximum age',
  path: ['minAge'],
});

export const CreateGroupWizard = ({ open, onClose, onSuccess }: CreateGroupWizardProps) => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [cities, setCities] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [ageRestricted, setAgeRestricted] = useState(false);

  const availableEquipment = [
    { id: 'bicycle', name: isRTL ? 'دراجة هوائية' : 'Bicycle' },
    { id: 'kayak', name: isRTL ? 'قارب كاياك' : 'Kayak' },
    { id: 'climbing', name: isRTL ? 'معدات تسلق' : 'Climbing Gear' },
    { id: 'camping', name: isRTL ? 'معدات تخييم' : 'Camping Equipment' },
    { id: 'diving', name: isRTL ? 'معدات غوص' : 'Diving Gear' },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupName: '',
      description: '',
      interests: [],
      joinMethod: 'open',
      city: '',
      memberType: 'all',
      locationRestriction: '',
      ageRestricted: false,
      minAge: 18,
      maxAge: 65,
      equipment: [],
      coverImage: '',
      admissionQuestions: [],
    },
  });

  // Load cities and interests
  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesData, interestsData] = await Promise.all([
          supabase.from('cities').select('*').eq('is_active', true).order('name_ar'),
          supabase.from('user_interests').select('*').order('name_ar')
        ]);
        
        if (citiesData.data) setCities(citiesData.data);
        if (interestsData.data) setInterests(interestsData.data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (!user) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      // Create group - auto-set visibility based on join method
      const visibility = values.joinMethod === 'request' ? 'private' : 'public';
      
      // Filter out empty questions
      const filteredQuestions = (values.admissionQuestions || []).filter((q: string) => q.trim() !== '');
      
      const { data: groupData, error: groupError } = await supabase
        .from('event_groups')
        .insert({
          group_name: values.groupName,
          description: values.description,
          description_ar: values.description,
          created_by: user.id,
          max_members: 500,
          city_id: values.city || null,
          image_url: values.coverImage || null,
          group_link: null,
          visibility: visibility,
          requires_approval: values.joinMethod === 'request',
          equipment: values.equipment || [],
          gender_restriction: values.memberType || 'all',
          location_restriction: values.locationRestriction || null,
          min_age: values.ageRestricted ? values.minAge : null,
          max_age: values.ageRestricted ? values.maxAge : null,
          admission_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
        })
        .select()
        .maybeSingle();

      if (groupError) {
        console.error('Group creation error:', groupError);
        throw groupError;
      }
      
      if (!groupData) {
        throw new Error('Failed to create group - no data returned');
      }

      // Add group interests
      if (values.interests.length > 0) {
        const interestInserts = values.interests.map(interestId => ({
          group_id: groupData.id,
          interest_id: interestId
        }));
        
        const { error: interestsError } = await supabase
          .from('group_interests')
          .insert(interestInserts);
          
        if (interestsError) {
          console.error('Interests creation error:', interestsError);
          throw interestsError;
        }
      }

      toast({
        title: isRTL ? 'تم بنجاح' : 'Success',
        description: isRTL ? 'تم إنشاء المجموعة بنجاح' : 'Group created successfully',
      });

      setHasUnsavedChanges(false);
      form.reset();
      onSuccess?.();
      
      // Navigate to group details
      navigate(`/groups/${groupData.id}`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      
      let errorMessage = error.message || (isRTL ? 'حدث خطأ أثناء إنشاء المجموعة' : 'Error creating group');
      
      // Handle specific errors
      if (error.code === '23503') {
        errorMessage = isRTL 
          ? 'خطأ في إنشاء المجموعة. يرجى المحاولة مرة أخرى.' 
          : 'Failed to create group. Please try again.';
      } else if (error.message?.includes('foreign key')) {
        errorMessage = isRTL 
          ? 'خطأ في ربط البيانات. يرجى المحاولة مرة أخرى.' 
          : 'Data linking error. Please try again.';
      }
      
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        isRTL ? 'هل تريد تجاهل التغييرات؟' : 'Discard changes?'
      );
      if (!confirmed) return;
    }
    form.reset();
    setSelectedInterests([]);
    setSelectedEquipment([]);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleInterestToggle = (interestId: string) => {
    const updated = selectedInterests.includes(interestId)
      ? selectedInterests.filter(i => i !== interestId)
      : [...selectedInterests, interestId];
    setSelectedInterests(updated);
    form.setValue('interests', updated);
    setHasUnsavedChanges(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `group-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('group-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('group-media')
        .getPublicUrl(filePath);

      form.setValue('coverImage', publicUrl);
      setHasUnsavedChanges(true);
      
      toast({
        title: isRTL ? 'نجح' : 'Success',
        description: isRTL ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: error.message || (isRTL ? 'فشل رفع الصورة' : 'Failed to upload image'),
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };


  const toggleEquipment = (equipmentId: string) => {
    const updated = selectedEquipment.includes(equipmentId)
      ? selectedEquipment.filter(e => e !== equipmentId)
      : [...selectedEquipment, equipmentId];
    setSelectedEquipment(updated);
    form.setValue('equipment', updated);
    setHasUnsavedChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {isRTL ? 'إنشاء مجموعة' : 'Add Group'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-group-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <Card className="p-4 border-l-4 border-l-primary">
              <h3 className="text-lg font-semibold mb-4">
                {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
              </h3>
              
              <div className="space-y-4">
                {/* Group Name */}
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="flex items-center gap-1">
                    {isRTL ? 'اسم المجموعة' : 'Group Name'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="groupName"
                    {...form.register('groupName')}
                    placeholder={isRTL ? 'أدخل اسم المجموعة' : 'Enter group name'}
                    className={form.formState.errors.groupName ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.groupName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.groupName.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {isRTL ? 'الوصف' : 'Description'}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({isRTL ? 'اختياري، حتى 200 حرف' : 'Optional, up to 200 characters'})
                    </span>
                  </Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder={isRTL ? 'أضف وصفاً مختصراً عن المجموعة' : 'Add a short description'}
                    rows={3}
                    maxLength={200}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-1">
                    {isRTL ? 'المدينة' : 'City / Location'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.watch('city')}
                    onValueChange={(value) => {
                      form.setValue('city', value);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {isRTL ? city.name_ar : city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>

                {/* Group Interests */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {isRTL ? 'اهتمامات المجموعة' : 'Group Interests'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'اختر اهتمام واحد أو أكثر' : 'Select one or more interests'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg max-h-48 overflow-y-auto">
                    {interests.map(interest => (
                      <div key={interest.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={interest.id}
                          checked={selectedInterests.includes(interest.id)}
                          onCheckedChange={() => handleInterestToggle(interest.id)}
                        />
                        <Label 
                          htmlFor={interest.id}
                          className="cursor-pointer text-sm font-normal leading-tight"
                        >
                          {isRTL ? interest.name_ar : interest.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedInterests.map((interestId) => {
                        const interest = interests.find(i => i.id === interestId);
                        return interest ? (
                          <Badge key={interestId} variant="secondary">
                            {isRTL ? interest.name_ar : interest.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  {form.formState.errors.interests && (
                    <p className="text-sm text-destructive">{form.formState.errors.interests.message}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Join Options Section */}
            <Card className="p-4 border-l-4 border-l-secondary">
              <h3 className="text-lg font-semibold mb-4">
                {isRTL ? 'خيارات الانضمام' : 'Join Options'}
              </h3>
              
              <div className="space-y-4">
                {/* Join Method */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {isRTL ? 'طريقة الانضمام' : 'Join Method'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {isRTL 
                      ? 'يتم تعيين خصوصية المجموعة تلقائياً حسب طريقة الانضمام'
                      : 'Group privacy is automatically set based on join method'}
                  </p>
                  <RadioGroup
                    value={form.watch('joinMethod')}
                    onValueChange={(value: 'open' | 'request') => {
                      form.setValue('joinMethod', value);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="open" id="open" />
                      <Label htmlFor="open" className="font-normal cursor-pointer flex-1">
                        <div className="font-medium">{isRTL ? 'مفتوح للجميع' : 'Open to All'}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? 'أي شخص يمكنه الانضمام مباشرة - المجموعة عامة' : 'Anyone can join directly - Group will be Public'}
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="request" id="request" />
                      <Label htmlFor="request" className="font-normal cursor-pointer flex-1">
                        <div className="font-medium">{isRTL ? 'طلب للانضمام' : 'Request to Join'}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? 'يتطلب موافقة المشرف - المجموعة خاصة' : 'Admin approval required - Group will be Private'}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Screening Questions - Only show when Request to Join is selected */}
                {form.watch('joinMethod') === 'request' && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        {isRTL ? 'أسئلة الفحص للمتقدمين' : 'Screening Questions for Applicants'}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'أضف أسئلة يجب على المتقدمين الإجابة عليها عند طلب الانضمام'
                        : 'Add questions applicants must answer when requesting to join'}
                    </p>
                    
                    {/* Questions List */}
                    <div className="space-y-2">
                      {(form.watch('admissionQuestions') || []).map((question: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                          <Input
                            value={question}
                            onChange={(e) => {
                              const questions = [...(form.watch('admissionQuestions') || [])];
                              questions[index] = e.target.value;
                              form.setValue('admissionQuestions', questions);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder={isRTL ? 'أدخل السؤال...' : 'Enter question...'}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const questions = (form.watch('admissionQuestions') || []).filter((_: string, i: number) => i !== index);
                              form.setValue('admissionQuestions', questions);
                              setHasUnsavedChanges(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Question Button */}
                    {(form.watch('admissionQuestions') || []).length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const questions = [...(form.watch('admissionQuestions') || []), ''];
                          form.setValue('admissionQuestions', questions);
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isRTL ? 'إضافة سؤال' : 'Add Question'}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({(form.watch('admissionQuestions') || []).length}/5)
                        </span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Member Requirements Section */}
            <Card className="p-4 border-l-4 border-l-accent">
              <h3 className="text-lg font-semibold mb-4">
                {isRTL ? 'متطلبات الأعضاء' : 'Member Requirements'}
              </h3>
              
              <div className="space-y-4">
                {/* Member Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {isRTL ? 'نوع الأعضاء' : 'Member Type'}
                    <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    value={form.watch('memberType')}
                    onValueChange={(value: 'all' | 'male' | 'female') => {
                      form.setValue('memberType', value);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="font-normal cursor-pointer">
                        {isRTL ? 'الجميع' : 'All'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="font-normal cursor-pointer">
                        {isRTL ? 'ذكور فقط' : 'Male only'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="font-normal cursor-pointer">
                        {isRTL ? 'إناث فقط' : 'Female only'}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Age Restriction */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="ageRestricted"
                      checked={ageRestricted}
                      onCheckedChange={(checked) => {
                        setAgeRestricted(checked as boolean);
                        form.setValue('ageRestricted', checked as boolean);
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <Label htmlFor="ageRestricted" className="font-normal cursor-pointer">
                      {isRTL ? 'تحديد الفئة العمرية' : 'Set age range'}
                    </Label>
                  </div>
                  
                  {ageRestricted && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="minAge">{isRTL ? 'من' : 'From'}</Label>
                        <Input
                          id="minAge"
                          type="number"
                          min="13"
                          max="100"
                          {...form.register('minAge', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxAge">{isRTL ? 'إلى' : 'To'}</Label>
                        <Input
                          id="maxAge"
                          type="number"
                          min="13"
                          max="100"
                          {...form.register('maxAge', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}
                  {form.formState.errors.minAge && (
                    <p className="text-sm text-destructive">{form.formState.errors.minAge.message}</p>
                  )}
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <Label>
                    {isRTL ? 'المعدات المطلوبة' : 'Required Equipment'}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({isRTL ? 'اختياري' : 'Optional'})
                    </span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'يجب أن يمتلك الأعضاء هذه المعدات للانضمام' : 'Members must have this equipment to join'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {availableEquipment.map((equipment) => (
                      <div key={equipment.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={equipment.id}
                          checked={selectedEquipment.includes(equipment.id)}
                          onCheckedChange={() => toggleEquipment(equipment.id)}
                        />
                        <Label htmlFor={equipment.id} className="font-normal cursor-pointer">
                          {equipment.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Media Section */}
            <Card className="p-4 border-l-4 border-l-muted">
              <h3 className="text-lg font-semibold mb-4">
                {isRTL ? 'صورة الغلاف' : 'Cover Image'}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coverImage">
                    {isRTL ? 'رفع صورة الغلاف' : 'Upload cover image'}
                    <span className="text-muted-foreground text-xs ml-2">
                      ({isRTL ? 'اختياري' : 'Optional'})
                    </span>
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="flex-1"
                    />
                    {uploadingImage && <Loader2 className="h-5 w-5 animate-spin" />}
                  </div>
                  {form.watch('coverImage') && (
                    <div className="mt-2">
                      <img
                        src={form.watch('coverImage')}
                        alt="Cover preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الحجم الموصى به: 1200x400 بكسل' : 'Recommended size: 1200x400px'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Organizer Info - Auto filled */}
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-muted-foreground">
                    {isRTL ? 'المنظم' : 'Organizer'}
                  </Label>
                  <p className="text-sm font-medium mt-1">
                    {user?.email || (isRTL ? 'المستخدم الحالي' : 'Current user')}
                  </p>
                </div>
                <Badge variant="secondary">{isRTL ? 'تلقائي' : 'Auto-filled'}</Badge>
              </div>
            </Card>
          </form>
        </div>

        {/* Footer - Fixed Button */}
        <div className="px-6 py-4 border-t bg-background">
          <Button
            type="submit"
            form="create-group-form"
            className="w-full"
            disabled={loading || uploadingImage}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isRTL ? 'جاري الإنشاء...' : 'Creating...'}
              </>
            ) : (
              isRTL ? 'إنشاء المجموعة' : 'Add Group'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};