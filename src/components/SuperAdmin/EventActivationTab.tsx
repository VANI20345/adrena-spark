import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Calendar, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MapPin,
  User,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface EventData {
  id: string;
  title: string;
  title_ar: string;
  description?: string | null;
  description_ar?: string | null;
  location: string;
  location_ar: string;
  start_date: string;
  end_date: string;
  price?: number | null;
  image_url?: string | null;
  status?: string | null;
  organizer_id: string;
  category_id?: string | null;
  organizer?: {
    user_id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
    name_ar: string;
  } | null;
}

export const EventActivationTab = () => {
  const { isRTL, language } = useLanguageContext();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pendingEvents = [], isLoading, error, refetch } = useSupabaseQuery({
    queryKey: ['pending-events-super-admin'],
    queryFn: async (): Promise<EventData[]> => {
      try {
        // Get pending events
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          throw eventsError;
        }
        
        if (!events || events.length === 0) return [];

        // Get organizer profiles for these events
        const organizerIds = [...new Set(events.map(e => e.organizer_id).filter(Boolean))];
        
        let profiles: any[] = [];
        if (organizerIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', organizerIds);
          
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            profiles = profilesData || [];
          }
        }

        // Get categories
        const categoryIds = [...new Set(events.filter(e => e.category_id).map(e => e.category_id as string))];
        
        let categories: any[] = [];
        if (categoryIds.length > 0) {
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name, name_ar')
            .in('id', categoryIds);
          
          if (categoriesError) {
            console.error('Error fetching categories:', categoriesError);
          } else {
            categories = categoriesData || [];
          }
        }

        // Merge data
        return events.map(event => ({
          ...event,
          organizer: profiles.find(p => p.user_id === event.organizer_id) || null,
          category: categories.find(c => c.id === event.category_id) || null,
        }));
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
  });

  const filteredEvents = (pendingEvents || []).filter(event => {
    if (!event) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      event.title?.toLowerCase().includes(searchLower) ||
      event.title_ar?.toLowerCase().includes(searchLower) ||
      event.organizer?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleApprove = async (eventId: string) => {
    try {
      const event = pendingEvents.find(e => e.id === eventId);
      
      const { error } = await supabase
        .from('events')
        .update({ status: 'approved' })
        .eq('id', eventId);

      if (error) throw error;

      // Log the action
      if (user?.id) {
        await supabase.from('admin_activity_logs').insert({
          admin_id: user.id,
          action: 'approve_event',
          entity_type: 'event',
          entity_id: eventId,
          details: {
            event_title: event?.title,
            organizer: event?.organizer?.full_name,
            approved_by: 'super_admin',
          }
        });
      }

      toast.success(isRTL ? 'تم تفعيل الفعالية بنجاح' : 'Event activated successfully');
      refetch();
    } catch (error) {
      console.error('Error approving event:', error);
      toast.error(isRTL ? 'حدث خطأ في تفعيل الفعالية' : 'Error activating event');
    }
  };

  const handleReject = async () => {
    if (!selectedEvent || !rejectReason.trim()) {
      toast.error(isRTL ? 'يرجى إدخال سبب الرفض' : 'Please enter a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      // Log the action
      if (user?.id) {
        await supabase.from('admin_activity_logs').insert({
          admin_id: user.id,
          action: 'reject_event',
          entity_type: 'event',
          entity_id: selectedEvent.id,
          details: {
            event_title: selectedEvent.title,
            organizer: selectedEvent.organizer?.full_name,
            reason: rejectReason,
            rejected_by: 'super_admin',
          }
        });
      }

      // Send notification to organizer
      if (selectedEvent.organizer_id) {
        await supabase.from('notifications').insert({
          user_id: selectedEvent.organizer_id,
          title: isRTL ? 'تم رفض الفعالية' : 'Event Rejected',
          message: `${isRTL ? 'تم رفض فعالية' : 'Event'} "${selectedEvent.title}" ${isRTL ? 'السبب:' : 'Reason:'} ${rejectReason}`,
          type: 'event_rejected',
        });
      }

      toast.success(isRTL ? 'تم رفض الفعالية' : 'Event rejected');
      setRejectDialogOpen(false);
      setSelectedEvent(null);
      setRejectReason('');
      refetch();
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error(isRTL ? 'حدث خطأ في رفض الفعالية' : 'Error rejecting event');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {isRTL ? 'حدث خطأ' : 'An Error Occurred'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isRTL ? 'لم نتمكن من تحميل الفعاليات المعلقة' : 'Unable to load pending events'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar className="h-5 w-5" />
                {isRTL ? 'تفعيل الفعاليات' : 'Event Activation'}
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL ? 'مراجعة وتفعيل الفعاليات المقدمة من أصحاب الأعمال' : 'Review and activate events submitted by business owners'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {pendingEvents.length} {isRTL ? 'فعالية معلقة' : 'pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={isRTL ? 'البحث بالعنوان أو اسم المنظم...' : 'Search by title or organizer...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10 text-right' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          {/* Events Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الفعالية' : 'Event'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المنظم' : 'Organizer'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'السعر' : 'Price'}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        {isRTL ? 'لا توجد فعاليات معلقة' : 'No Pending Events'}
                      </h3>
                      <p className="text-muted-foreground">
                        {isRTL ? 'جميع الفعاليات تمت مراجعتها' : 'All events have been reviewed'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {event.image_url ? (
                            <img 
                              src={event.image_url} 
                              alt={event.title} 
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-medium">{language === 'ar' ? event.title_ar : event.title}</p>
                            <p className={`text-xs text-muted-foreground flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <MapPin className="h-3 w-3" />
                              {language === 'ar' ? event.location_ar : event.location}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{event.organizer?.full_name || (isRTL ? 'غير معروف' : 'Unknown')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                          <p>{formatDate(event.start_date)}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatTime(event.start_date)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{event.price || 0} {isRTL ? 'ريال' : 'SAR'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(event.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedEvent(event);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>{isRTL ? 'تفاصيل الفعالية' : 'Event Details'}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.image_url && (
                <img 
                  src={selectedEvent.image_url} 
                  alt={selectedEvent.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'العنوان' : 'Title'}
                  </label>
                  <p className="font-medium">{language === 'ar' ? selectedEvent.title_ar : selectedEvent.title}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'المنظم' : 'Organizer'}
                  </label>
                  <p className="font-medium">{selectedEvent.organizer?.full_name || (isRTL ? 'غير معروف' : 'Unknown')}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'التاريخ' : 'Date'}
                  </label>
                  <p className="font-medium">{formatDate(selectedEvent.start_date)} {formatTime(selectedEvent.start_date)}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'السعر' : 'Price'}
                  </label>
                  <p className="font-medium">{selectedEvent.price || 0} {isRTL ? 'ريال' : 'SAR'}</p>
                </div>
                <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'الموقع' : 'Location'}
                  </label>
                  <p className="font-medium">{language === 'ar' ? selectedEvent.location_ar : selectedEvent.location}</p>
                </div>
                <div className={`col-span-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isRTL ? 'الوصف' : 'Description'}
                  </label>
                  <p className="text-sm">{language === 'ar' ? selectedEvent.description_ar : selectedEvent.description}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <DialogTitle>{isRTL ? 'رفض الفعالية' : 'Reject Event'}</DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL 
                ? `هل أنت متأكد من رفض فعالية "${selectedEvent?.title}"؟`
                : `Are you sure you want to reject "${selectedEvent?.title}"?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'سبب الرفض' : 'Rejection Reason'}
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={isRTL ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={isRTL ? 'text-right' : 'text-left'}
            />
          </div>
          <DialogFooter className={isRTL ? 'flex-row-reverse gap-2' : 'gap-2'}>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {isRTL ? 'رفض' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};