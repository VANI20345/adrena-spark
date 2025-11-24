import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, FileText, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface ReportData {
  period: string;
  totalUsers: number;
  newUsers: number;
  totalEvents: number;
  approvedEvents: number;
  totalServices: number;
  approvedServices: number;
  totalBookings: number;
  totalRevenue: number;
  totalRefunds: number;
}

export const AdminReportsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalServices: 0,
    totalRevenue: 0,
    totalBookings: 0
  });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, reportPeriod]);

  const getPeriodDates = (period: ReportPeriod): { start: Date; end: Date }[] => {
    const now = new Date();
    const periods: { start: Date; end: Date }[] = [];

    switch (period) {
      case 'daily':
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push({
            start: startOfDay(date),
            end: endOfDay(date)
          });
        }
        break;
      case 'weekly':
        // Last 12 weeks
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          periods.push({
            start: startOfWeek(date, { locale: ar }),
            end: endOfWeek(date, { locale: ar })
          });
        }
        break;
      case 'monthly':
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push({
            start: startOfMonth(date),
            end: endOfMonth(date)
          });
        }
        break;
      case 'yearly':
        // Last 5 years
        for (let i = 4; i >= 0; i--) {
          const date = new Date(now);
          date.setFullYear(date.getFullYear() - i);
          periods.push({
            start: startOfYear(date),
            end: endOfYear(date)
          });
        }
        break;
      default:
        periods.push({
          start: startOfMonth(now),
          end: endOfMonth(now)
        });
    }

    return periods;
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const periods = getPeriodDates(reportPeriod);
      const data: ReportData[] = [];
      
      let totalUsers = 0;
      let totalEvents = 0;
      let totalServices = 0;
      let totalRevenue = 0;
      let totalBookings = 0;

      for (const period of periods) {
        const startDate = period.start.toISOString();
        const endDate = period.end.toISOString();

        // Fetch users
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: newUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Fetch events
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const { count: approvedEventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Fetch services
        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const { count: approvedServicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Fetch bookings
        const { data: bookingsData, count: bookingsCount } = await supabase
          .from('bookings')
          .select('total_amount', { count: 'exact' })
          .eq('status', 'confirmed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const revenue = bookingsData?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;

        // Fetch refunds
        const { data: refundsData } = await supabase
          .from('refunds')
          .select('amount')
          .eq('status', 'completed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const refunds = refundsData?.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;

        const periodLabel = format(period.start, 
          reportPeriod === 'daily' ? 'yyyy-MM-dd' :
          reportPeriod === 'weekly' ? "'أسبوع' w yyyy" :
          reportPeriod === 'monthly' ? 'MMMM yyyy' :
          'yyyy',
          { locale: ar }
        );

        data.push({
          period: periodLabel,
          totalUsers: usersCount || 0,
          newUsers: newUsersCount || 0,
          totalEvents: eventsCount || 0,
          approvedEvents: approvedEventsCount || 0,
          totalServices: servicesCount || 0,
          approvedServices: approvedServicesCount || 0,
          totalBookings: bookingsCount || 0,
          totalRevenue: revenue,
          totalRefunds: refunds
        });

        totalUsers = usersCount || 0;
        totalEvents += eventsCount || 0;
        totalServices += servicesCount || 0;
        totalRevenue += revenue;
        totalBookings += bookingsCount || 0;
      }

      setReportData(data);
      setSummaryStats({
        totalUsers,
        totalEvents,
        totalServices,
        totalRevenue,
        totalBookings
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['الفترة', 'إجمالي المستخدمين', 'مستخدمين جدد', 'إجمالي الفعاليات', 'فعاليات مقبولة', 'إجمالي الخدمات', 'خدمات مقبولة', 'الحجوزات', 'الإيرادات', 'المبالغ المستردة'];
    const rows = reportData.map(row => [
      row.period,
      row.totalUsers,
      row.newUsers,
      row.totalEvents,
      row.approvedEvents,
      row.totalServices,
      row.approvedServices,
      row.totalBookings,
      `${row.totalRevenue.toFixed(2)} ر.س`,
      `${row.totalRefunds.toFixed(2)} ر.س`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admin-report-${reportPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تحميل التقرير بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                التقارير الإدارية
              </CardTitle>
              <CardDescription>
                تقارير شاملة عن أداء المنصة
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={reportPeriod} onValueChange={(value: ReportPeriod) => setReportPeriod(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي (آخر 30 يوم)</SelectItem>
                  <SelectItem value="weekly">أسبوعي (آخر 12 أسبوع)</SelectItem>
                  <SelectItem value="monthly">شهري (آخر 12 شهر)</SelectItem>
                  <SelectItem value="yearly">سنوي (آخر 5 سنوات)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={downloadCSV} variant="outline" disabled={loading || reportData.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                تحميل CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold">{summaryStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفعاليات</p>
                <p className="text-2xl font-bold">{summaryStats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الخدمات</p>
                <p className="text-2xl font-bold">{summaryStats.totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">الحجوزات</p>
                <p className="text-2xl font-bold">{summaryStats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-sm text-muted-foreground">الإيرادات</p>
                <p className="text-2xl font-bold">{summaryStats.totalRevenue.toFixed(0)} ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير مفصل - {reportPeriod === 'daily' ? 'يومي' : reportPeriod === 'weekly' ? 'أسبوعي' : reportPeriod === 'monthly' ? 'شهري' : 'سنوي'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات للعرض
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفترة</TableHead>
                    <TableHead className="text-center">إجمالي المستخدمين</TableHead>
                    <TableHead className="text-center">مستخدمين جدد</TableHead>
                    <TableHead className="text-center">الفعاليات</TableHead>
                    <TableHead className="text-center">الخدمات</TableHead>
                    <TableHead className="text-center">الحجوزات</TableHead>
                    <TableHead className="text-center">الإيرادات</TableHead>
                    <TableHead className="text-center">المسترد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell className="text-center">{row.totalUsers}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50">
                          +{row.newUsers}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.totalEvents} <span className="text-xs text-muted-foreground">({row.approvedEvents} مقبول)</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.totalServices} <span className="text-xs text-muted-foreground">({row.approvedServices} مقبول)</span>
                      </TableCell>
                      <TableCell className="text-center">{row.totalBookings}</TableCell>
                      <TableCell className="text-center font-medium text-green-600">
                        {row.totalRevenue.toFixed(2)} ر.س
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {row.totalRefunds.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};