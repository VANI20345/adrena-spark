import { supabase } from '@/integrations/supabase/client';

export const serviceBookingService = {
  // Create a new service booking
  create: async (bookingData: {
    service_id: string;
    provider_id: string;
    booking_date: string;
    service_date: string;
    total_amount: number;
    special_requests?: string;
  }) => {
    return supabase
      .from('service_bookings')
      .insert({
        ...bookingData,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending'
      })
      .select()
      .single();
  },

  // Get user's service bookings
  getUserBookings: (userId: string) =>
    supabase
      .from('service_bookings')
      .select(`
        *,
        services!service_id(
          name_ar,
          name,
          image_url,
          duration_minutes,
          profiles!provider_id(full_name, phone)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  // Get provider's service bookings
  getProviderBookings: (providerId: string) =>
    supabase
      .from('service_bookings')
      .select(`
        *,
        services!service_id(name_ar, name),
        profiles!user_id(full_name, phone)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false }),

  // Update booking status and send notification to customer
  updateStatus: async (bookingId: string, status: string) => {
    const result = await supabase
      .from('service_bookings')
      .update({ status })
      .eq('id', bookingId)
      .select(`
        *,
        services!service_id(name_ar, name),
        provider:profiles!provider_id(full_name)
      `)
      .single();
    
    if (result.data && !result.error) {
      const booking = result.data as any;
      
      // Send notification to customer about status change
      const statusMessages: Record<string, { title_ar: string; title_en: string; message_ar: string; message_en: string }> = {
        confirmed: {
          title_ar: 'تم تأكيد حجزك',
          title_en: 'Booking Confirmed',
          message_ar: `تم تأكيد حجزك لخدمة "${booking.services?.name_ar || booking.services?.name}" من قبل مقدم الخدمة ${booking.provider?.full_name}`,
          message_en: `Your booking for "${booking.services?.name || booking.services?.name_ar}" has been confirmed by ${booking.provider?.full_name}`
        },
        completed: {
          title_ar: 'تم اكتمال الخدمة',
          title_en: 'Service Completed',
          message_ar: `تم اكتمال خدمة "${booking.services?.name_ar || booking.services?.name}" بنجاح`,
          message_en: `Service "${booking.services?.name || booking.services?.name_ar}" has been completed successfully`
        },
        cancelled: {
          title_ar: 'تم إلغاء الحجز',
          title_en: 'Booking Cancelled',
          message_ar: `تم إلغاء حجزك لخدمة "${booking.services?.name_ar || booking.services?.name}" من قبل مقدم الخدمة`,
          message_en: `Your booking for "${booking.services?.name || booking.services?.name_ar}" has been cancelled by the provider`
        }
      };
      
      const statusInfo = statusMessages[status];
      if (statusInfo && booking.user_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: booking.user_id,
            type: 'service_booking_update',
            title: statusInfo.title_ar,
            message: statusInfo.message_ar,
            data: {
              booking_id: bookingId,
              service_id: booking.service_id,
              status: status,
              provider_name: booking.provider?.full_name
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }
    }
    
    return result;
  },

  // Get provider revenue stats
  getProviderRevenue: async (providerId: string) => {
    const { data, error } = await supabase
      .from('service_bookings')
      .select('total_amount, status')
      .eq('provider_id', providerId);

    if (error) throw error;

    const totalRevenue = data
      ?.filter(booking => booking.status === 'completed')
      ?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

    const pendingRevenue = data
      ?.filter(booking => booking.status === 'confirmed')
      ?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

    return {
      totalRevenue,
      pendingRevenue,
      totalBookings: data?.length || 0,
      completedBookings: data?.filter(booking => booking.status === 'completed')?.length || 0
    };
  }
};