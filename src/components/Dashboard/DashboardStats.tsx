import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, Award, Star, MapPin } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color?: string;
}

type TrendType = 'up' | 'down' | 'neutral';

const StatCard: React.FC<StatCardProps> = ({ title, value, change, trend, icon, color = 'primary' }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="relative overflow-hidden mobile-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full bg-${color}/10 flex items-center justify-center`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className={`flex items-center text-xs ${getTrendColor()} mt-1`}>
            {getTrendIcon()}
            <span className="ml-1">{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DashboardStatsProps {
  userRole: 'attendee' | 'provider' | 'admin';
  stats?: any;
  isLoading?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ userRole, stats: propStats, isLoading: propLoading }) => {
  const { t } = useLanguageContext();
  const { stats: realTimeStats, loading: statsLoading } = useRealTimeStats(userRole);
  
  const isLoading = propLoading || statsLoading;
  const stats = propStats || realTimeStats;

  const getAttendeeStats = () => [
    {
      title: t('dashboardPage.totalBookings', 'إجمالي الحجوزات'),
      value: stats?.totalBookings || 0,
      change: stats?.monthlyGrowth?.bookings ? `+${stats.monthlyGrowth.bookings} هذا الشهر` : undefined,
      trend: (stats?.monthlyGrowth?.bookings > 0 ? 'up' : 'neutral') as TrendType,
      icon: <Calendar className="h-4 w-4 text-primary" />,
    },
    {
      title: t('dashboardPage.upcomingEvents', 'الفعاليات القادمة'),
      value: stats?.upcomingEvents || 0,
      change: stats?.upcomingEvents > 0 ? 'خلال أسبوعين' : 'لا توجد فعاليات',
      trend: 'neutral' as TrendType,
      icon: <MapPin className="h-4 w-4 text-blue-500" />,
    },
    {
      title: t('dashboardPage.loyaltyPoints', 'نقاط الولاء'),
      value: stats?.loyaltyPoints || 0,
      change: stats?.monthlyGrowth?.points ? `+${stats.monthlyGrowth.points} نقطة` : undefined,
      trend: (stats?.monthlyGrowth?.points > 0 ? 'up' : 'neutral') as TrendType,
      icon: <Award className="h-4 w-4 text-yellow-500" />,
    },
    {
      title: t('dashboardPage.totalSpent', 'إجمالي المصروفات'),
      value: stats?.totalSpent ? `${stats.totalSpent.toLocaleString()} ريال` : '0 ريال',
      change: stats?.monthlyGrowth?.spending ? `+${stats.monthlyGrowth.spending.toLocaleString()} ريال` : undefined,
      trend: (stats?.monthlyGrowth?.spending > 0 ? 'up' : 'neutral') as TrendType,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
    },
  ];

  const getOrganizerStats = () => [
    {
      title: 'إجمالي الفعاليات',
      value: stats?.totalEvents || 0,
      change: stats?.monthlyGrowth?.events ? `+${stats.monthlyGrowth.events} هذا الشهر` : undefined,
      trend: (stats?.monthlyGrowth?.events > 0 ? 'up' : 'neutral') as TrendType,
      icon: <Calendar className="h-4 w-4 text-primary" />,
    },
    {
      title: 'إجمالي المشاركين',
      value: stats?.totalAttendees || 0,
      change: stats?.monthlyGrowth?.attendees ? `+${stats.monthlyGrowth.attendees} مشارك` : undefined,
      trend: (stats?.monthlyGrowth?.attendees > 0 ? 'up' : 'neutral') as TrendType,
      icon: <Users className="h-4 w-4 text-blue-500" />,
    },
    {
      title: 'الإيرادات الشهرية',
      value: stats?.monthlyRevenue ? `${stats.monthlyRevenue.toLocaleString()} ريال` : '0 ريال',
      change: stats?.monthlyGrowth?.revenue > 0 ? `+${((stats.monthlyGrowth.revenue / (stats.monthlyRevenue || 1)) * 100).toFixed(1)}%` : undefined,
      trend: (stats?.monthlyGrowth?.revenue > 0 ? 'up' : 'neutral') as TrendType,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
    },
    {
      title: 'متوسط التقييم',
      value: stats?.averageRating?.toFixed(1) || '0.0',
      change: undefined,
      trend: 'neutral' as TrendType,
      icon: <Star className="h-4 w-4 text-yellow-500" />,
    },
    {
      title: 'الفعاليات النشطة',
      value: stats?.activeEvents || 0,
      change: stats?.activeEvents > 0 ? 'جارية الآن' : 'لا توجد فعاليات نشطة',
      trend: 'neutral' as TrendType,
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
  ];

  const getProviderStats = () => [
    {
      title: 'إجمالي الخدمات',
      value: '15',
      change: '+2 هذا الشهر',
      trend: 'up' as const,
      icon: <Calendar className="h-4 w-4 text-primary" />,
    },
    {
      title: 'طلبات الخدمة',
      value: '89',
      change: '+15 طلب',
      trend: 'up' as const,
      icon: <Users className="h-4 w-4 text-blue-500" />,
    },
    {
      title: 'الإيرادات الشهرية',
      value: '28,400 ريال',
      change: '+8%',
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
    },
    {
      title: 'متوسط التقييم',
      value: '4.6',
      change: '+0.1',
      trend: 'up' as const,
      icon: <Star className="h-4 w-4 text-yellow-500" />,
    },
  ];

  const getAdminStats = () => [
    {
      title: 'إجمالي المستخدمين',
      value: '12,345',
      change: '+234 هذا الشهر',
      trend: 'up' as const,
      icon: <Users className="h-4 w-4 text-primary" />,
    },
    {
      title: 'إجمالي الفعاليات',
      value: '1,456',
      change: '+45 فعالية',
      trend: 'up' as const,
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
    },
    {
      title: 'إجمالي الإيرادات',
      value: '234,500 ريال',
      change: '+15%',
      trend: 'up' as const,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
    },
    {
      title: 'الفعاليات النشطة',
      value: '89',
      change: 'جارية الآن',
      trend: 'neutral' as const,
      icon: <TrendingUp className="h-4 w-4 text-yellow-500" />,
    },
    {
      title: 'معدل النمو',
      value: '18%',
      change: '+3% نمو',
      trend: 'up' as const,
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
  ];

  const getStats = () => {
    switch (userRole) {
      case 'attendee':
        return getAttendeeStats();
      case 'provider':
        return getProviderStats();
      case 'admin':
        return getAdminStats();
      default:
        return getAttendeeStats();
    }
  };

  const statsData = getStats();

  if (isLoading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden mobile-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded w-16 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {statsData.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default DashboardStats;