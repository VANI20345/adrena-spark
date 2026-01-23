import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Calendar, ShoppingCart } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedReportFilters } from '@/components/Reports/EnhancedReportFilters';
import { ReportCharts } from '@/components/Reports/ReportCharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface ReportData {
  period: string;
  newUsers: number;
  newEvents: number;
  newServices: number;
  totalBookings: number;
  totalRevenue: number;
}

const AdminReportsTab = () => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchReportData = async () => {
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

    const [users, events, services, bookings] = await Promise.all([
      supabase.from('profiles').select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase.from('events').select('created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase.from('services').select('created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase.from('bookings').select('created_at, total_amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    const groupedData = new Map<string, ReportData & { sortKey: string }>();

    const addToGroup = (date: Date, type: 'user' | 'event' | 'service' | 'booking', amount = 0) => {
      let periodKey: string;
      let sortKey: string;
      
      if (selectedDay) {
        // For day view, use date string for sorting
        sortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        periodKey = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      } else if (selectedMonth) {
        // For month view, sort by day number
        sortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        periodKey = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' });
      } else {
        // For year view, sort by month
        sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        periodKey = date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' });
      }

      if (!groupedData.has(sortKey)) {
        groupedData.set(sortKey, {
          period: periodKey,
          sortKey,
          newUsers: 0,
          newEvents: 0,
          newServices: 0,
          totalBookings: 0,
          totalRevenue: 0
        });
      }

      const data = groupedData.get(sortKey)!;
      if (type === 'user') data.newUsers++;
      if (type === 'event') data.newEvents++;
      if (type === 'service') data.newServices++;
      if (type === 'booking') {
        data.totalBookings++;
        data.totalRevenue += amount;
      }
    };

    (users.data || []).forEach(u => addToGroup(new Date(u.created_at), 'user'));
    (events.data || []).forEach(e => addToGroup(new Date(e.created_at), 'event'));
    (services.data || []).forEach(s => addToGroup(new Date(s.created_at), 'service'));
    (bookings.data || []).forEach(b => addToGroup(new Date(b.created_at), 'booking', b.total_amount));

    // Sort by sortKey (chronological) then return without sortKey
    return Array.from(groupedData.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey, ...rest }) => rest);
  };

  const { data: reportData = [], isLoading } = useSupabaseQuery({
    queryKey: ['admin-reports', selectedYear.toString(), selectedMonth?.toString() || 'all', selectedDay?.toISOString() || 'all'],
    queryFn: fetchReportData
  });

  const summary = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return {
        totalUsers: 0,
        totalEvents: 0,
        totalServices: 0,
        totalBookings: 0,
        totalRevenue: 0
      };
    }
    
    return reportData.reduce((acc, curr) => ({
      totalUsers: acc.totalUsers + curr.newUsers,
      totalEvents: acc.totalEvents + curr.newEvents,
      totalServices: acc.totalServices + curr.newServices,
      totalBookings: acc.totalBookings + curr.totalBookings,
      totalRevenue: acc.totalRevenue + curr.totalRevenue
    }), {
      totalUsers: 0,
      totalEvents: 0,
      totalServices: 0,
      totalBookings: 0,
      totalRevenue: 0
    });
  }, [reportData]);

  const revenueData = (reportData || []).map(d => ({ name: d.period, value: d.totalRevenue }));
  const bookingsData = (reportData || []).map(d => ({ name: d.period, value: d.totalBookings }));

  const downloadCSV = () => {
    const headers = [
      t('admin.reports.period'),
      t('admin.reports.newUsers'),
      t('admin.reports.newEvents'),
      t('admin.reports.newServices'),
      t('admin.reports.totalBookings'),
      `${t('admin.reports.totalRevenue')} (${t('admin.reports.riyal')})`
    ];
    const csvContent = [
      headers.join(','),
      ...(reportData || []).map(row => [
        row.period,
        row.newUsers,
        row.newEvents,
        row.newServices,
        row.totalBookings,
        row.totalRevenue.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admin_report_${selectedYear}_${selectedMonth || 'yearly'}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold">{t('admin.reports.title')}</h2>
          <p className="text-muted-foreground">{t('admin.reports.subtitle')}</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Download className="h-4 w-4" />
          {t('admin.reports.downloadCSV')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t('admin.reports.filterTitle')}</CardTitle>
          <CardDescription>{t('admin.reports.filterDescription')}</CardDescription>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="text-sm font-medium">{t('admin.reports.newUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-2xl font-bold">{summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.reports.inSelectedPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="text-sm font-medium">{t('admin.reports.newEvents')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-2xl font-bold">{summary.totalEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.reports.inSelectedPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="text-sm font-medium">{t('admin.reports.newServices')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-2xl font-bold">{summary.totalServices}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.reports.inSelectedPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="text-sm font-medium">{t('admin.reports.totalBookings')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-2xl font-bold">{summary.totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.reports.inSelectedPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className="text-sm font-medium">{t('admin.reports.totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalRevenue.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })} {t('admin.reports.riyal')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.reports.inSelectedPeriod')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <ReportCharts
        revenueData={revenueData}
        bookingsData={bookingsData}
        title={t('admin.reports.detailedStats')}
        isLoading={isLoading}
      />

      {/* Detailed Table */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t('admin.reports.detailedData')}</CardTitle>
          <CardDescription>{t('admin.reports.detailedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.period')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.users')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.events')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.services')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.bookings')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('admin.reports.revenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!reportData || reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('admin.reports.noDataAvailable')}
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{row.period}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{row.newUsers}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{row.newEvents}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{row.newServices}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>{row.totalBookings}</TableCell>
                      <TableCell className={`text-green-600 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                        {row.totalRevenue.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })} {t('admin.reports.riyal')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsTab;
