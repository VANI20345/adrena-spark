import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Download, Calendar, TrendingUp, Users, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportData {
  period: string;
  newUsers: number;
  newEvents: number;
  newServices: number;
  totalBookings: number;
  totalRevenue: number;
  confirmedBookings: number;
}

export const AdminReportsTab = () => {
  const [reportType, setReportType] = useState<ReportPeriod>('monthly');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const getDateRanges = () => {
    const ranges = [];
    const now = new Date();

    switch (reportType) {
      case 'daily':
        for (let i = 29; i >= 0; i--) {
          const date = subDays(now, i);
          ranges.push({
            start: startOfDay(date),
            end: endOfDay(date),
            label: format(date, 'yyyy-MM-dd', { locale: ar })
          });
        }
        break;
      case 'weekly':
        for (let i = 11; i >= 0; i--) {
          const date = subWeeks(now, i);
          ranges.push({
            start: startOfWeek(date, { weekStartsOn: 6 }),
            end: endOfWeek(date, { weekStartsOn: 6 }),
            label: `أسبوع ${format(startOfWeek(date, { weekStartsOn: 6 }), 'dd/MM', { locale: ar })}`
          });
        }
        break;
      case 'monthly':
        for (let i = 11; i >= 0; i--) {
          const date = subMonths(now, i);
          ranges.push({
            start: startOfMonth(date),
            end: endOfMonth(date),
            label: format(date, 'MMMM yyyy', { locale: ar })
          });
        }
        break;
      case 'yearly':
        for (let i = 4; i >= 0; i--) {
          const date = subYears(now, i);
          ranges.push({
            start: startOfYear(date),
            end: endOfYear(date),
            label: format(date, 'yyyy', { locale: ar })
          });
        }
        break;
    }

    return ranges;
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const ranges = getDateRanges();
      const reports: ReportData[] = [];

      for (const range of ranges) {
        const [usersResult, eventsResult, servicesResult, bookingsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString()),
          
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString()),
          
          supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString()),
          
          supabase
            .from('bookings')
            .select('total_amount, status')
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString())
        ]);

        const bookings = bookingsResult.data || [];
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

        reports.push({
          period: range.label,
          newUsers: usersResult.count || 0,
          newEvents: eventsResult.count || 0,
          newServices: servicesResult.count || 0,
          totalBookings: bookings.length,
          totalRevenue,
          confirmedBookings: confirmedBookings.length
        });
      }

      setReportData(reports);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['الفترة', 'مستخدمون جدد', 'فعاليات جديدة', 'خدمات جديدة', 'حجوزات', 'حجوزات مؤكدة', 'الإيرادات'];
    const rows = reportData.map(r => [
      r.period,
      r.newUsers,
      r.newEvents,
      r.newServices,
      r.totalBookings,
      r.confirmedBookings,
      `${r.totalRevenue} ر.س`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admin-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('تم تحميل التقرير');
  };

  const getTotalStats = () => {
    return {
      totalUsers: reportData.reduce((sum, r) => sum + r.newUsers, 0),
      totalEvents: reportData.reduce((sum, r) => sum + r.newEvents, 0),
      totalServices: reportData.reduce((sum, r) => sum + r.newServices, 0),
      totalBookings: reportData.reduce((sum, r) => sum + r.totalBookings, 0),
      totalRevenue: reportData.reduce((sum, r) => sum + r.totalRevenue, 0),
      confirmedBookings: reportData.reduce((sum, r) => sum + r.confirmedBookings, 0)
    };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                التقارير الإدارية
              </CardTitle>
              <CardDescription>تقارير مفصلة عن أداء المنصة</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportPeriod)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي (30 يوم)</SelectItem>
                  <SelectItem value="weekly">أسبوعي (12 أسبوع)</SelectItem>
                  <SelectItem value="monthly">شهري (12 شهر)</SelectItem>
                  <SelectItem value="yearly">سنوي (5 سنوات)</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين الجدد</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الفعاليات الجديدة</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الخدمات الجديدة</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">مؤكد: {stats.confirmedBookings}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} ر.س</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>تقرير مفصل</CardTitle>
          <CardDescription>البيانات التفصيلية حسب الفترة المحددة</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات متاحة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفترة</TableHead>
                    <TableHead className="text-center">مستخدمون جدد</TableHead>
                    <TableHead className="text-center">فعاليات جديدة</TableHead>
                    <TableHead className="text-center">خدمات جديدة</TableHead>
                    <TableHead className="text-center">حجوزات</TableHead>
                    <TableHead className="text-center">حجوزات مؤكدة</TableHead>
                    <TableHead className="text-right">الإيرادات (ر.س)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell className="text-center">{row.newUsers}</TableCell>
                      <TableCell className="text-center">{row.newEvents}</TableCell>
                      <TableCell className="text-center">{row.newServices}</TableCell>
                      <TableCell className="text-center">{row.totalBookings}</TableCell>
                      <TableCell className="text-center">{row.confirmedBookings}</TableCell>
                      <TableCell className="text-right font-mono">{row.totalRevenue.toFixed(2)}</TableCell>
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
