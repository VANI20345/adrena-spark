import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  eventsService, 
  bookingsService, 
  profilesService, 
  loyaltyService,
  walletService,
  supabaseServices 
} from '@/services/supabaseServices';

interface UserStats {
  totalBookings: number;
  upcomingEvents: number;
  loyaltyPoints: number;
  totalSpent: number;
  monthlyGrowth?: {
    bookings: number;
    spending: number;
    points: number;
  };
}

interface OrganizerStats {
  totalEvents: number;
  totalAttendees: number;
  monthlyRevenue: number;
  averageRating: number;
  activeEvents: number;
  monthlyGrowth?: {
    events: number;
    attendees: number;
    revenue: number;
  };
}

interface ProviderStats {
  totalServices: number;
  serviceRequests: number;
  monthlyRevenue: number;
  averageRating: number;
  monthlyGrowth?: {
    services: number;
    requests: number;
    revenue: number;
  };
}

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  activeEvents: number;
  growthRate: number;
  monthlyGrowth?: {
    users: number;
    events: number;
    revenue: number;
  };
}

export const useRealTimeStats = (userRole: 'attendee' | 'provider' | 'admin') => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendeeStats = useCallback(async () => {
    if (!user?.id) return;
    
    const [bookingsRes, profileRes, loyaltyRes] = await Promise.all([
      bookingsService.getByUser(user.id),
      profilesService.getByUserId(user.id),
      loyaltyService.getPointsByUserId(user.id)
    ]);

    const bookings = bookingsRes.data || [];
    const profile = profileRes.data;
    const loyaltyPoints = loyaltyRes.data || [];

    // Calculate upcoming events
    const now = new Date();
    const upcomingEvents = bookings.filter(booking => 
      booking.events && new Date(booking.events.start_date) > now
    ).length;

    // Calculate total spent
    const totalSpent = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // Calculate monthly growth
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthBookings = bookings.filter(b => 
      new Date(b.created_at) >= thisMonth
    ).length;

    const thisMonthSpending = bookings
      .filter(b => 
        b.status === 'confirmed' && 
        new Date(b.created_at) >= thisMonth
      )
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const totalPointsBalance = profile?.points_balance || 0;
    const thisMonthPoints = loyaltyPoints
      .filter(lp => new Date(lp.created_at) >= thisMonth)
      .reduce((sum, lp) => sum + (lp.points || 0), 0);

    setStats({
      totalBookings: bookings.length,
      upcomingEvents,
      loyaltyPoints: totalPointsBalance,
      totalSpent,
      monthlyGrowth: {
        bookings: thisMonthBookings,
        spending: thisMonthSpending,
        points: thisMonthPoints
      }
    });
  }, [user?.id]);

  const fetchProviderStats = useCallback(async () => {
    if (!user?.id) return;
    
    // Fetch services
    const { data: services } = await supabase
      .from('services')
      .select('id, status, created_at')
      .eq('provider_id', user.id);

    const approvedServices = services?.filter(s => s.status === 'approved') || [];
    const serviceIds = approvedServices.map(s => s.id);

    // Fetch service bookings
    const { data: bookings } = await supabase
      .from('service_bookings')
      .select('total_amount, status, created_at')
      .eq('provider_id', user.id);

    // Fetch reviews for average rating
    let reviews: any[] = [];
    if (serviceIds.length > 0) {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .in('service_id', serviceIds);
      reviews = reviewsData || [];
    }

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    // Calculate monthly data
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthServices = services?.filter(s => 
      new Date(s.created_at) >= thisMonth
    ).length || 0;

    const pendingRequests = bookings?.filter(b => b.status === 'pending').length || 0;
    const thisMonthRequests = bookings?.filter(b => 
      new Date(b.created_at) >= thisMonth
    ).length || 0;

    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const monthlyRevenue = completedBookings
      .filter(b => new Date(b.created_at) >= thisMonth)
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    setStats({
      totalServices: approvedServices.length,
      serviceRequests: pendingRequests,
      monthlyRevenue,
      totalRevenue,
      averageRating: avgRating,
      monthlyGrowth: {
        services: thisMonthServices,
        requests: thisMonthRequests,
        revenue: monthlyRevenue
      }
    });
  }, [user?.id]);

  const fetchAdminStats = useCallback(async () => {
    if (!user?.id) return;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Fetch all counts in parallel
    const [
      { count: totalUsers },
      { count: totalEvents },
      { count: thisMonthUsers },
      { count: thisMonthEvents },
      { data: events },
      { data: bookings }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thisMonth.toISOString()),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', thisMonth.toISOString()),
      supabase.from('events').select('id, start_date, end_date, status'),
      supabase.from('bookings').select('total_amount, status, created_at').eq('status', 'confirmed')
    ]);

    // Calculate active events
    const now = new Date();
    const activeEvents = events?.filter(e => 
      e.status === 'approved' && 
      new Date(e.start_date) <= now && 
      new Date(e.end_date) >= now
    ).length || 0;

    // Calculate revenue
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
    const thisMonthRevenue = bookings
      ?.filter(b => new Date(b.created_at) >= thisMonth)
      .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    // Calculate growth rate (users growth percentage)
    const lastMonthUsersCount = (totalUsers || 0) - (thisMonthUsers || 0);
    const growthRate = lastMonthUsersCount > 0 
      ? ((thisMonthUsers || 0) / lastMonthUsersCount) * 100 
      : 0;

    setStats({
      totalUsers: totalUsers || 0,
      totalEvents: totalEvents || 0,
      totalRevenue,
      activeEvents,
      growthRate: Math.min(growthRate, 100), // Cap at 100%
      monthlyGrowth: {
        users: thisMonthUsers || 0,
        events: thisMonthEvents || 0,
        revenue: thisMonthRevenue
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        switch (userRole) {
          case 'attendee':
            await fetchAttendeeStats();
            break;
          case 'provider':
            await fetchProviderStats();
            break;
          case 'admin':
            await fetchAdminStats();
            break;
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('فشل في تحميل الإحصائيات');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userRole, fetchAttendeeStats, fetchProviderStats, fetchAdminStats]);

  const refetch = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      switch (userRole) {
        case 'attendee':
          await fetchAttendeeStats();
          break;
        case 'provider':
          await fetchProviderStats();
          break;
        case 'admin':
          await fetchAdminStats();
          break;
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('فشل في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch };
};
