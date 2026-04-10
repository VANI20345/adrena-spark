import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, Users, TrendingUp, Briefcase } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { EnhancedReportFilters } from '@/components/Reports/EnhancedReportFilters';
import { ReportCharts } from '@/components/Reports/ReportCharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalBookings: number;
  completedServices: number;
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

interface ProviderReportsProps {
  providerId: string;
  services: any[];
  serviceBookings: any[];
  chartOnly?: boolean;
}

const ProviderReports = ({ 
  providerId, 
  services, 
  serviceBookings,
  chartOnly = false 
}: ProviderReportsProps) => {
  const { t, language } = useLanguageContext();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchReportData = async () => {
    if (!providerId) return { reportData: [], detailedBookings: [] };

    let startDate: Date;
    let endDate: Date;

    if (selectedDay) {
      startDate = new Date(selectedDay);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDay);
      endDate.setHours(23, 59, 59, 999);
    } else if (selectedMonth) {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    }

    const { data: bookings } = await supabase
      .from('service_bookings')
      .select(`
        id,
        booking_date,
        service_date,
        total_amount,
        status,
        user_id,
        service_id,
        services (name, name_ar),
        profiles:user_id (full_name)
      `)
      .eq('provider_id', providerId)
      .gte('booking_date', startDate.toISOString())
      .lte('booking_date', endDate.toISOString())
      .order('booking_date', { ascending: false });

    const groupedData = new Map<string, ReportData>();

    bookings?.forEach(booking => {
      const date = new Date(booking.booking_date);
      let periodKey: string;

      if (selectedDay) {
        periodKey = date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      } else if (selectedMonth) {
        periodKey = date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' });
      } else {
        periodKey = date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' });
      }

      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, {
          period: periodKey,
          totalRevenue: 0,
          totalBookings: 0,
          completedServices: 0
        });
      }

      const data = groupedData.get(periodKey)!;
      data.totalRevenue += booking.total_amount;
      data.totalBookings++;
      if (booking.status === 'completed') data.completedServices++;
    });

    const reportDataArray = Array.from(groupedData.values()).sort((a, b) => a.period.localeCompare(b.period));

    const detailedBookingsArray: DetailedBooking[] = (bookings || []).map(booking => ({
      id: booking.id,
      service_name: (booking.services as any)?.name_ar || (booking.services as any)?.name || (language === 'ar' ? 'خدمة غير محددة' : 'Unspecified Service'),
      customer_name: (booking.profiles as any)?.full_name || (language === 'ar' ? 'عميل غير محدد' : 'Unspecified Customer'),
      booking_date: booking.booking_date,
      service_date: booking.service_date,
      amount: booking.total_amount,
      status: booking.status
    }));

    return { reportData: reportDataArray, detailedBookings: detailedBookingsArray };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['provider-reports', providerId, selectedYear.toString(), selectedMonth?.toString() || 'all', selectedDay?.toISOString() || 'all'],
    queryFn: fetchReportData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const reportData = data?.reportData || [];
  const detailedBookings = data?.detailedBookings || [];

  const summary = useMemo(() => {
    return reportData.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      totalBookings: acc.totalBookings + curr.totalBookings,
      completedServices: acc.completedServices + curr.completedServices
    }), {
      totalRevenue: 0,
      totalBookings: 0,
      completedServices: 0
    });
  }, [reportData]);

  const revenueData = reportData.map(d => ({ name: d.period, value: d.totalRevenue }));
  const bookingsData = reportData.map(d => ({ name: d.period, value: d.totalBookings }));

  const downloadCSV = () => {
    const headers = language === 'ar' 
      ? ['الفترة', 'إجمالي الإيرادات (ريال)', 'عدد الحجوزات', 'الخدمات المكتملة']
      : ['Period', 'Total Revenue (SAR)', 'Bookings Count', 'Completed Services'];
    
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.period,
        row.totalRevenue.toFixed(2),
        row.totalBookings,
        row.completedServices
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `provider_report_${selectedYear}_${selectedMonth || 'annual'}.csv`;
    link.click();
  };

  if (chartOnly) {
    return (
      <ReportCharts
        revenueData={revenueData}
        bookingsData={bookingsData}
        title={language === 'ar' ? "الإحصائيات التفصيلية" : "Detailed Statistics"}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'التقارير المالية' : 'Financial Reports'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تحليل شامل لأداء خدماتك' : 'Comprehensive analysis of your services performance'}
          </p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تحميل CSV' : 'Download CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'فلاتر التقرير' : 'Report Filters'}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'اختر الفترة الزمنية لعرض التقرير' : 'Select the time period to view the report'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedReportFilters
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedDay={selectedDay}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            onDayChange={setSelectedDay}
            onApplyFilters={() => {}}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('providerDashboard.totalRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalRevenue.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })} {t('providerDashboard.sar')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'متوسط الإيرادات' : 'Average Revenue'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalBookings > 0 
                ? (summary.totalRevenue / summary.totalBookings).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })
                : 0} {t('providerDashboard.sar')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'خدمات مكتملة' : 'Completed Services'}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completedServices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <ReportCharts
        revenueData={revenueData}
        bookingsData={bookingsData}
        title={language === 'ar' ? "الإحصائيات التفصيلية" : "Detailed Statistics"}
        isLoading={isLoading}
      />

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'ملخص التقرير' : 'Report Summary'}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'عرض شامل لبيانات الفترة المحددة' : 'Comprehensive view of the selected period data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'الفترة' : 'Period'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {t('providerDashboard.totalRevenue')}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'عدد الحجوزات' : 'Bookings Count'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'خدمات مكتملة' : 'Completed'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'متوسط القيمة' : 'Avg Value'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {row.totalRevenue.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })} {t('providerDashboard.sar')}
                    </TableCell>
                    <TableCell>{row.totalBookings}</TableCell>
                    <TableCell>{row.completedServices}</TableCell>
                    <TableCell>
                      {row.totalBookings > 0 
                        ? (row.totalRevenue / row.totalBookings).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })
                        : 0} {t('providerDashboard.sar')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'تفاصيل الحجوزات' : 'Booking Details'}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'قائمة شاملة بجميع الحجوزات' : 'Comprehensive list of all bookings'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'اسم الخدمة' : 'Service Name'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'اسم العميل' : 'Customer Name'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'تاريخ الحجز' : 'Booking Date'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'تاريخ الخدمة' : 'Service Date'}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {t('providerDashboard.amount')}
                  </TableHead>
                  <TableHead className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {t('providerDashboard.status')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedBookings.slice(0, 20).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.service_name}</TableCell>
                    <TableCell>{booking.customer_name}</TableCell>
                    <TableCell>{new Date(booking.booking_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</TableCell>
                    <TableCell>{new Date(booking.service_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {booking.amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {t('providerDashboard.sar')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        booking.status === 'completed' ? 'default' : 
                        booking.status === 'confirmed' ? 'secondary' : 
                        booking.status === 'cancelled' ? 'destructive' : 'outline'
                      }>
                        {booking.status === 'completed' 
                          ? t('providerDashboard.completed')
                          : booking.status === 'confirmed' 
                            ? (language === 'ar' ? 'مؤكد' : 'Confirmed')
                            : booking.status === 'cancelled' 
                              ? t('providerDashboard.cancelled')
                              : t('providerDashboard.pending')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderReports;
