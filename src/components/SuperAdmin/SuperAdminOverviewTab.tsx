import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Shield, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock,
  TrendingUp
} from 'lucide-react';

export const SuperAdminOverviewTab = () => {
  const { isRTL } = useLanguageContext();

  const { data: stats, isLoading } = useSupabaseQuery({
    queryKey: ['super-admin-overview-stats'],
    queryFn: async () => {
      // Get total admins count
      const { count: adminCount, error: adminError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminError) console.error('Error fetching admin count:', adminError);

      // Get total super admins count
      const { count: superAdminCount, error: superAdminError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if (superAdminError) console.error('Error fetching super admin count:', superAdminError);

      // Get pending events count
      const { count: pendingEvents, error: pendingError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) console.error('Error fetching pending events:', pendingError);

      // Get total revenue from confirmed bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('status', 'confirmed');

      if (bookingsError) console.error('Error fetching bookings:', bookingsError);
      
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      // Get today's activity count
      const today = new Date().toISOString().split('T')[0];
      const { count: todayActivities, error: activitiesError } = await supabase
        .from('admin_activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      if (activitiesError) console.error('Error fetching activities:', activitiesError);

      return {
        adminCount: adminCount || 0,
        superAdminCount: superAdminCount || 0,
        pendingEvents: pendingEvents || 0,
        totalRevenue,
        todayActivities: todayActivities || 0,
      };
    },
  });

  const statCards = [
    {
      title: isRTL ? 'إجمالي المشرفين' : 'Total Admins',
      value: stats?.adminCount ?? 0,
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: isRTL ? 'المشرفين الأعلى' : 'Super Admins',
      value: stats?.superAdminCount ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: isRTL ? 'فعاليات معلقة' : 'Pending Events',
      value: stats?.pendingEvents ?? 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ${isRTL ? 'ريال' : 'SAR'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: isRTL ? 'أنشطة اليوم' : "Today's Activities",
      value: stats?.todayActivities ?? 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{isRTL ? 'ملخص سريع' : 'Quick Summary'}</CardTitle>
            <CardDescription>
              {isRTL ? 'نظرة سريعة على حالة النظام' : 'Quick overview of system status'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{isRTL ? 'حالة النظام' : 'System Status'}</span>
                <span className={`flex items-center gap-2 text-green-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  {isRTL ? 'نشط' : 'Active'}
                </span>
              </div>
              <div className={`flex items-center justify-between p-3 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{isRTL ? 'آخر تحديث' : 'Last Update'}</span>
                <span className="text-muted-foreground">
                  {new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
            <CardDescription>
              {isRTL ? 'الوصول السريع للمهام الشائعة' : 'Quick access to common tasks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <span className="text-sm">{isRTL ? 'مراجعة الفعاليات' : 'Review Events'}</span>
              </button>
              <button className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                <span className="text-sm">{isRTL ? 'إدارة الصلاحيات' : 'Manage Roles'}</span>
              </button>
              <button className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                <span className="text-sm">{isRTL ? 'التقارير المالية' : 'Financial Reports'}</span>
              </button>
              <button className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <span className="text-sm">{isRTL ? 'أداء المشرفين' : 'Admin Performance'}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
