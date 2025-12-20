import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

  const fetchAttendeeStats = async () => {
      const [bookingsRes, profileRes, loyaltyRes, walletRes] = await Promise.all([
        bookingsService.getByUser(user.id),
        profilesService.getByUserId(user.id),
        loyaltyService.getPointsByUserId(user.id),
        walletService.getTransactions(user.id)
      ]);

      const bookings = bookingsRes.data || [];
      const profile = profileRes.data;
      const loyaltyPoints = loyaltyRes.data || [];
      const transactions = walletRes.data || [];

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
    };

    const fetchOrganizerStats = async () => {
      const [eventsRes, bookingsRes] = await Promise.all([
        eventsService.getByOrganizer(user.id),
        supabaseServices.bookings.getByOrganizer(user.id)
      ]);

      const events = eventsRes.data || [];
      const bookings = bookingsRes.data || [];

      // Calculate stats
      const totalAttendees = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.quantity || 0), 0);

      const monthlyRevenue = bookings
        .filter(b => {
          const bookingDate = new Date(b.created_at);
          const thisMonth = new Date();
          thisMonth.setDate(1);
          return b.status === 'confirmed' && bookingDate >= thisMonth;
        })
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const now = new Date();
      const activeEvents = events.filter(event => 
        new Date(event.start_date) > now && event.status === 'approved'
      ).length;

      // Calculate monthly growth
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const thisMonthEvents = events.filter(e => 
        new Date(e.created_at) >= thisMonth
      ).length;

      const thisMonthAttendees = bookings
        .filter(b => 
          b.status === 'confirmed' && 
          new Date(b.created_at) >= thisMonth
        )
        .reduce((sum, b) => sum + (b.quantity || 0), 0);

      setStats({
        totalEvents: events.length,
        totalAttendees,
        monthlyRevenue,
        averageRating: 4.8, // TODO: Calculate from reviews
        activeEvents,
        monthlyGrowth: {
          events: thisMonthEvents,
          attendees: thisMonthAttendees,
          revenue: monthlyRevenue
        }
      });
    };

    const fetchProviderStats = async () => {
      // TODO: Implement provider stats when services are ready
      setStats({
        totalServices: 0,
        serviceRequests: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        monthlyGrowth: {
          services: 0,
          requests: 0,
          revenue: 0
        }
      });
    };

    const fetchAdminStats = async () => {
      // TODO: Implement admin stats aggregation
      setStats({
        totalUsers: 0,
        totalEvents: 0,
        totalRevenue: 0,
        activeEvents: 0,
        growthRate: 0,
        monthlyGrowth: {
          users: 0,
          events: 0,
          revenue: 0
        }
      });
    };

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
  }, [user, userRole]);

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