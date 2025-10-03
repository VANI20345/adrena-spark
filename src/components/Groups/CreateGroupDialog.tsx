import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users } from 'lucide-react';

const formSchema = z.object({
  group_name: z.string().min(3, 'اسم المجموعة يجب أن يكون 3 أحرف على الأقل'),
  group_type: z.enum(['event', 'region']),
  event_id: z.string().optional(),
  max_members: z.number().min(2, 'أقل عدد أعضاء هو 2').max(500, 'أقصى عدد أعضاء هو 500'),
  group_link: z.string().url('رابط غير صحيح').optional().or(z.literal(''))
});

type FormData = z.infer<typeof formSchema>;

interface CreateGroupDialogProps {
  events?: Array<{ id: string; title_ar: string }>;
  onGroupCreated?: () => void;
}

export const CreateGroupDialog = ({ events = [], onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      group_name: '',
      group_type: 'event',
      event_id: '',
      max_members: 50,
      group_link: ''
    }
  });

  const groupType = form.watch('group_type');

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('event_groups').insert({
        group_name: data.group_name,
        group_type: data.group_type,
        event_id: data.group_type === 'event' ? data.event_id || null : null,
        max_members: data.max_members,
        group_link: data.group_link || null,
        created_by: user.id,
        current_members: 1
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح!',
        description: 'تم إنشاء المجموعة بنجاح'
      });

      form.reset();
      setOpen(false);
      onGroupCreated?.();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء المجموعة',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('createGroup', 'إنشاء مجموعة')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('createNewGroup', 'إنشاء مجموعة جديدة')}
          </DialogTitle>
          <DialogDescription>
            {t('createGroupDescription', 'أنشئ مجموعة للتواصل مع المشاركين في فعالياتك أو منطقتك')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="group_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groupName', 'اسم المجموعة')}</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: مغامرو الرياض" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="group_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groupType', 'نوع المجموعة')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المجموعة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="event">{t('eventGroup', 'مجموعة فعالية')}</SelectItem>
                      <SelectItem value="region">{t('regionGroup', 'مجموعة منطقة')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {groupType === 'event' && (
              <FormField
                control={form.control}
                name="event_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('selectEvent', 'اختر الفعالية')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفعالية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="max_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maxMembers', 'أقصى عدد أعضاء')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="2"
                      max="500"
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
              name="group_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groupLink', 'رابط المجموعة (اختياري)')}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://wa.me/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('cancel', 'إلغاء')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('creating', 'جاري الإنشاء...') : t('create', 'إنشاء')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};