import { supabase } from '@/integrations/supabase/client';

// Events Services
export const eventsService = {
  getAll: () => 
    supabase
      .from('events')
      .select('*, categories(*)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),

  getById: (id: string) =>
    supabase
      .from('events')
      .select('*, categories(*)')
      .eq('id', id)
      .single(),

  getByOrganizer: (organizerId: string) =>
    supabase
      .from('events')
      .select('*, categories(*), bookings(*)')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false }),

  create: (eventData: any) =>
    supabase
      .from('events')
      .insert(eventData)
      .select()
      .single(),

  update: (id: string, eventData: any) =>
    supabase
      .from('events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single(),

  delete: (id: string) =>
    supabase
      .from('events')
      .delete()
      .eq('id', id),

  search: (query: string) =>
    supabase
      .from('events')
      .select('*, categories(*)')
      .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
};

// Services Services
export const servicesService = {
  getAll: () =>
    supabase
      .from('services')
      .select('*, categories(*)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),

  getById: (id: string) =>
    supabase
      .from('services')
      .select('*, categories(*)')
      .eq('id', id)
      .single(),

  getByProvider: (providerId: string) =>
    supabase
      .from('services')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false }),

  getByProviderWithStatus: (providerId: string, status: string) =>
    supabase
      .from('services')
      .select('*')
      .eq('provider_id', providerId)
      .eq('status', status)
      .order('created_at', { ascending: false }),

  getProviderStats: async (providerId: string) => {
    const [servicesResult, requestsResult] = await Promise.all([
      supabase
        .from('services')
        .select('id, status')
        .eq('provider_id', providerId),
      
      supabase
        .from('service_requests')
        .select('id, status, negotiated_price')
        .eq('provider_id', providerId)
    ]);

    return {
      services: servicesResult,
      requests: requestsResult
    };
  },

  create: (serviceData: any) =>
    supabase
      .from('services')
      .insert(serviceData)
      .select()
      .single(),

  update: (id: string, serviceData: any) =>
    supabase
      .from('services')
      .update(serviceData)
      .eq('id', id)
      .select()
      .single(),

  delete: (id: string) =>
    supabase
      .from('services')
      .delete()
      .eq('id', id),

  search: (query: string) =>
    supabase
      .from('services')
      .select('*, categories(*)')
      .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
};

// Categories Services
export const categoriesService = {
  getAll: () =>
    supabase
      .from('categories')
      .select('*')
      .order('name'),

  getById: (id: string) =>
    supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single(),

  create: (categoryData: any) =>
    supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single(),

  update: (id: string, categoryData: any) =>
    supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single(),

  delete: (id: string) =>
    supabase
      .from('categories')
      .delete()
      .eq('id', id),
};

// Bookings Services
export const bookingsService = {
  getByUser: (userId: string) =>
    supabase
      .from('bookings')
      .select('*, events!fk_bookings_event_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  getByEvent: (eventId: string) =>
    supabase
      .from('bookings')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),

  create: (bookingData: any) =>
    supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single(),

  update: (id: string, bookingData: any) =>
    supabase
      .from('bookings')
      .update(bookingData)
      .eq('id', id)
      .select()
      .single(),

  cancel: (id: string) =>
    supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single(),
};

// Profiles Services
export const profilesService = {
  getByUserId: (userId: string) =>
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single(),

  update: (userId: string, profileData: any) =>
    supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single(),

  create: (profileData: any) =>
    supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single(),
};

// User Roles Services
export const userRolesService = {
  getByUserId: (userId: string) =>
    supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single(),

  update: (userId: string, role: 'attendee' | 'provider' | 'admin') =>
    supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single(),

  create: (roleData: any) =>
    supabase
      .from('user_roles')
      .insert(roleData)
      .select()
      .single(),
};

// Notifications Services
export const notificationsService = {
  getByUserId: (userId: string) =>
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  markAsRead: (id: string) =>
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id),

  markAllAsRead: (userId: string) =>
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId),

  create: (notificationData: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) =>
    supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single(),

  createBookingConfirmation: (userId: string, eventTitle: string, bookingId: string) =>
    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'booking',
        title: 'تأكيد الحجز',
        message: `تم تأكيد حجزك لفعالية "${eventTitle}" بنجاح`,
        data: { booking_id: bookingId }
      })
      .select()
      .single(),

  createEventReminder: (userId: string, eventTitle: string, eventId: string, reminderTime: string) =>
    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'event',
        title: 'تذكير بالفعالية',
        message: `تذكير: فعالية "${eventTitle}" ستبدأ ${reminderTime}`,
        data: { event_id: eventId }
      })
      .select()
      .single(),

  createGroupMessage: (userId: string, groupName: string, groupId: string) =>
    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'group',
        title: 'رسالة جديدة في المجموعة',
        message: `رسالة جديدة في مجموعة "${groupName}"`,
        data: { group_id: groupId }
      })
      .select()
      .single(),

  createSystemNotification: (userId: string, title: string, message: string, data?: any) =>
    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'system',
        title,
        message,
        data
      })
      .select()
      .single(),

  createPromotionalNotification: (userId: string, title: string, message: string, data?: any) =>
    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'promotion',
        title,
        message,
        data
      })
      .select()
      .single(),
};

// Wallet Services
export const walletService = {
  getByUserId: (userId: string) =>
    supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single(),

  getTransactions: (userId: string) =>
    supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
};

// Loyalty Points Services
export const loyaltyService = {
  getPointsByUserId: (userId: string) =>
    supabase
      .from('loyalty_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  getTotalPoints: (userId: string) =>
    supabase
      .from('loyalty_ledger')
      .select('points')
      .eq('user_id', userId),
};

// Reviews Services
export const reviewsService = {
  getByEventId: (eventId: string) =>
    supabase
      .from('reviews')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),

  getByServiceId: (serviceId: string) =>
    supabase
      .from('reviews')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false }),

  create: (reviewData: any) =>
    supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single(),
};

// Updated Services Structure
const events = {
  getByOrganizer: async (organizerId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', organizerId);
    if (error) throw error;
    return data || [];
  },
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, categories(*), profiles!events_organizer_id_fkey(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

const bookings = {
  getByOrganizer: async (organizerId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, events!fk_bookings_event_id!inner(*)')
      .eq('events.organizer_id', organizerId);
    if (error) throw error;
    return { data: data || [], error: null };
  },
  getByEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], error: null };
  }
};

const profiles = {};
const services = {};

const groups = {
  getRegionGroups: async () => {
    const { data, error } = await supabase
      .from('regional_groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getEventGroups: async (userId: string) => {
    const { data, error } = await supabase
      .from('event_groups')
      .select('*')
      .not('event_id', 'is', null);
    if (error) throw error;
    return data || [];
  }
};

const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');
  if (error) throw error;
  return data || [];
};

// Cities Services
export const citiesService = {
  getAll: () =>
    supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name_ar'),

  getById: (id: string) =>
    supabase
      .from('cities')
      .select('*')
      .eq('id', id)
      .single(),
};

// Site Statistics Services
export const statisticsService = {
  getAll: () =>
    supabase
      .from('site_statistics')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),

  updateStat: (key: string, value: string) =>
    supabase
      .from('site_statistics')
      .update({ 
        stat_value_ar: value, 
        stat_value_en: value,
        updated_at: new Date().toISOString()
      })
      .eq('stat_key', key),
};

// Rating Services
export const ratingsService = {
  getByEntity: (entityId: string, entityType: 'event' | 'service') =>
    supabase
      .from('rating_summaries')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .single(),

  getAllEventRatings: () =>
    supabase
      .from('rating_summaries')
      .select('*')
      .eq('entity_type', 'event'),
};

export const supabaseServices = { 
  events, 
  bookings, 
  profiles, 
  services, 
  groups, 
  getCategories,
  cities: citiesService,
  statistics: statisticsService,
  ratings: ratingsService,
  supabase // Add direct supabase access
};