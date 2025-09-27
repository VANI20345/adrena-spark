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

  // Update booking status
  updateStatus: (bookingId: string, status: string) =>
    supabase
      .from('service_bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single(),

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