import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalBookings: number;
  totalServices: number;
  averageRating: number;
  topService?: string;
}

interface DetailedBooking {
  id: string;
  service_name: string;
  customer_name: string;
  booking_date: string;
  service_date: string;
  amount: number;
  status: string;
}

const ProviderReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time'>('monthly');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [detailedBookings, setDetailedBookings] = useState<DetailedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDate, setJoinDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchJoinDate = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setJoinDate(new Date(profile.created_at));
        }
      }
    };

    fetchJoinDate();
  }, [user]);

  useEffect(() => {
    if (user && joinDate) {
      fetchReportData();
    }
  }, [user, reportType, joinDate]);

  const fetchReportData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch service bookings with related data
      const { data: bookings, error: bookingsError } = await supabase
        .from('service_bookings')
        .select(`
          id,
          booking_date,
          service_date,
          total_amount,
          status,
          user_id,
          service_id,
          services (
            name,
            name_ar
          ),
          profiles:user_id (
            full_name
          )
        `)
        .eq('provider_id', user.id)
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch service requests
      const { data: requests, error: requestsError } = await supabase
        .from('service_requests')
        .select(`
          id,
          created_at,
          negotiated_price,
          status,
          service_id,
          services (
            name,
            name_ar
          )
        `)
        .eq('provider_id', user.id)
        .eq('status', 'accepted');

      if (requestsError) throw requestsError;

      // Process data based on report type
      const processedData = processReportData(bookings || [], requests || [], reportType);
      setReportData(processedData);

      // Process detailed bookings
      const detailed = (bookings || []).map(booking => ({
        id: booking.id,
        service_name: (booking.services as any)?.name_ar || (booking.services as any)?.name || 'خدمة غير محددة',
        customer_name: (booking.profiles as any)?.full_name || 'عميل غير محدد',
        booking_date: booking.booking_date,
        service_date: booking.service_date,
        amount: booking.total_amount,
        status: booking.status
      }));
      setDetailedBookings(detailed);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات التقارير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (bookings: any[], requests: any[], type: string): ReportData[] => {
    const groupedData = new Map<string, ReportData>();

    // Process bookings
    bookings.forEach(booking => {
      const date = new Date(booking.booking_date);
      const periodKey = getPeriodKey(date, type);

      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, {
          period: periodKey,
          totalRevenue: 0,
          totalBookings: 0,
          totalServices: 0,
          averageRating: 0
        });
      }

      const data = groupedData.get(periodKey)!;
      data.totalRevenue += booking.total_amount;
      data.totalBookings += 1;
    });

    // Process requests
    requests.forEach(request => {
      const date = new Date(request.created_at);
      const periodKey = getPeriodKey(date, type);

      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, {
          period: periodKey,
          totalRevenue: 0,
          totalBookings: 0,
          totalServices: 0,
          averageRating: 0
        });
      }

      const data = groupedData.get(periodKey)!;
      data.totalRevenue += request.negotiated_price || 0;
      data.totalBookings += 1;
    });

    return Array.from(groupedData.values()).sort((a, b) => b.period.localeCompare(a.period));
  };

  const getPeriodKey = (date: Date, type: string): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (type) {
      case 'daily':
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      case 'weekly':
        const weekNumber = getWeekNumber(date);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'yearly':
        return `${year}`;
      default:
        return `${year}-${String(month).padStart(2, '0')}`;
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const formatPeriod = (period: string, type: string): string => {
    if (type === 'daily') {
      return new Date(period).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (type === 'weekly') {
      const [year, week] = period.split('-W');
      return `الأسبوع ${week} من ${year}`;
    } else if (type === 'monthly') {
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
    } else {
      return period;
    }
  };

  const downloadReport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      downloadCSV();
    } else {
      toast({
        title: "قريباً",
        description: "ميزة تحميل PDF قيد التطوير",
      });
    }
  };

  const downloadCSV = () => {
    const headers = ['الفترة', 'إجمالي الإيرادات (ريال)', 'عدد الحجوزات', 'متوسط التقييم'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        formatPeriod(row.period, reportType),
        row.totalRevenue,
        row.totalBookings,
        row.averageRating
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTotalStats = () => {
    return reportData.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      totalBookings: acc.totalBookings + curr.totalBookings,
    }), { totalRevenue: 0, totalBookings: 0 });
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">التقارير المالية</h2>
          <p className="text-muted-foreground">تحليل شامل لأداء خدماتك</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport('csv')} className="gap-2">
            <Download className="h-4 w-4" />
            تحميل CSV
          </Button>
          <Button variant="outline" onClick={() => downloadReport('pdf')} className="gap-2">
            <Download className="h-4 w-4" />
            تحميل PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString()} ريال</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBookings > 0 ? Math.round(stats.totalRevenue / stats.totalBookings).toLocaleString() : 0} ريال
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفترة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.length}</div>
            <p className="text-xs text-muted-foreground">
              {reportType === 'all-time' ? 'منذ الانضمام' : reportType === 'daily' ? 'أيام' : reportType === 'weekly' ? 'أسابيع' : reportType === 'monthly' ? 'أشهر' : 'سنوات'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={reportType} onValueChange={(value) => setReportType(value as any)} dir="rtl">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">يومي</TabsTrigger>
          <TabsTrigger value="weekly">أسبوعي</TabsTrigger>
          <TabsTrigger value="monthly">شهري</TabsTrigger>
          <TabsTrigger value="yearly">سنوي</TabsTrigger>
          <TabsTrigger value="all-time">كل الوقت</TabsTrigger>
        </TabsList>

        <TabsContent value={reportType} className="space-y-4">
          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>ملخص التقرير</CardTitle>
              <CardDescription>
                عرض شامل لبيانات الفترة المحددة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : reportData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الفترة</TableHead>
                        <TableHead className="text-right">إجمالي الإيرادات</TableHead>
                        <TableHead className="text-right">عدد الحجوزات</TableHead>
                        <TableHead className="text-right">متوسط القيمة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{formatPeriod(row.period, reportType)}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{row.totalRevenue.toLocaleString()} ريال</TableCell>
                          <TableCell>{row.totalBookings}</TableCell>
                          <TableCell>
                            {row.totalBookings > 0 ? Math.round(row.totalRevenue / row.totalBookings).toLocaleString() : 0} ريال
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للفترة المحددة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الحجوزات</CardTitle>
              <CardDescription>
                قائمة شاملة بجميع الحجوزات
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : detailedBookings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">اسم الخدمة</TableHead>
                        <TableHead className="text-right">اسم العميل</TableHead>
                        <TableHead className="text-right">تاريخ الحجز</TableHead>
                        <TableHead className="text-right">تاريخ الخدمة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedBookings.slice(0, 20).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.service_name}</TableCell>
                          <TableCell>{booking.customer_name}</TableCell>
                          <TableCell>{new Date(booking.booking_date).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{new Date(booking.service_date).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{booking.amount.toLocaleString()} ريال</TableCell>
                          <TableCell>
                            <Badge variant={
                              booking.status === 'completed' ? 'default' : 
                              booking.status === 'confirmed' ? 'secondary' : 
                              booking.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {booking.status === 'completed' ? 'مكتمل' : 
                               booking.status === 'confirmed' ? 'مؤكد' : 
                               booking.status === 'cancelled' ? 'ملغي' : 'معلق'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حجوزات
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderReports;
