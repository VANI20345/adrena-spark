import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Percent,
  Download,
  Calendar,
  CreditCard,
  Wallet,
  PiggyBank
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';

export const FinancialDashboardTab = () => {
  const { isRTL } = useLanguageContext();
  const [period, setPeriod] = useState<string>('month');

  const { data: financialData, isLoading } = useSupabaseQuery({
    queryKey: ['financial-dashboard-v2', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = startOfMonth(now);
      }

      // Fetch commission rates from system_settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['commission_events', 'commission_services', 'commission_training']);

      const commissionRates: Record<string, number> = { events: 10, services: 10, training: 10 };
      settingsData?.forEach((item) => {
        const value = typeof item.value === 'object' && item.value !== null
          ? (item.value as { percentage?: number }).percentage
          : item.value;
        const pct = Number(value) || 10;
        if (item.key === 'commission_events') commissionRates.events = pct;
        if (item.key === 'commission_services') commissionRates.services = pct;
        if (item.key === 'commission_training') commissionRates.training = pct;
      });

      // Get bookings with actual financial columns
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_amount, vat_amount, platform_commission, vat_on_commission, provider_earnings, status, created_at')
        .gte('created_at', startDate.toISOString())
        .in('status', ['confirmed', 'completed']);

      // Get service bookings with actual financial columns
      const { data: serviceBookings } = await supabase
        .from('service_bookings')
        .select('id, total_amount, platform_commission, vat_on_commission, provider_earnings, status, created_at')
        .gte('created_at', startDate.toISOString())
        .in('status', ['confirmed', 'completed']);

      // Get wallet transactions
      const { data: walletTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Calculate totals from ACTUAL DB columns
      const eventRevenue = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
      const serviceRevenue = serviceBookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;
      const totalRevenue = eventRevenue + serviceRevenue;

      // Use actual platform_commission from DB
      const eventCommission = bookings?.reduce((sum, b) => sum + (Number(b.platform_commission) || 0), 0) || 0;
      const serviceCommission = serviceBookings?.reduce((sum, b) => sum + (Number(b.platform_commission) || 0), 0) || 0;
      const totalPlatformCommission = eventCommission + serviceCommission;

      // Use actual vat_on_commission from DB
      const eventVatOnCommission = bookings?.reduce((sum, b) => sum + (Number(b.vat_on_commission) || 0), 0) || 0;
      const serviceVatOnCommission = serviceBookings?.reduce((sum, b) => sum + (Number(b.vat_on_commission) || 0), 0) || 0;
      const totalVatOnCommission = eventVatOnCommission + serviceVatOnCommission;

      // Use actual provider_earnings from DB
      const eventProviderEarnings = bookings?.reduce((sum, b) => sum + (Number(b.provider_earnings) || 0), 0) || 0;
      const serviceProviderEarnings = serviceBookings?.reduce((sum, b) => sum + (Number(b.provider_earnings) || 0), 0) || 0;
      const totalProviderEarnings = eventProviderEarnings + serviceProviderEarnings;

      // Net platform profit = commission - VAT on commission
      const netProfit = totalPlatformCommission - totalVatOnCommission;

      // Wallet stats
      const totalTopups = walletTransactions?.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const totalWithdrawals = walletTransactions?.filter(t => t.type === 'withdraw').reduce((s, t) => s + Math.abs(t.amount || 0), 0) || 0;

      return {
        totalRevenue,
        eventRevenue,
        serviceRevenue,
        totalPlatformCommission,
        totalVatOnCommission,
        totalProviderEarnings,
        netProfit,
        totalTopups,
        totalWithdrawals,
        commissionRates,
        transactionsCount: (bookings?.length || 0) + (serviceBookings?.length || 0),
        recentTransactions: [...(bookings || []), ...(serviceBookings || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10),
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isRTL ? 'ريال' : 'SAR'}`;
  };

  const exportFinancialReport = () => {
    const headers = isRTL ? ['المقياس', 'القيمة'] : ['Metric', 'Value'];
    const csvContent = [
      headers.join(','),
      [isRTL ? 'إجمالي الإيرادات' : 'Total Revenue', financialData?.totalRevenue || 0].join(','),
      [isRTL ? 'إيرادات الفعاليات' : 'Event Revenue', financialData?.eventRevenue || 0].join(','),
      [isRTL ? 'إيرادات الخدمات' : 'Service Revenue', financialData?.serviceRevenue || 0].join(','),
      [isRTL ? 'عمولة المنصة' : 'Platform Commission', financialData?.totalPlatformCommission || 0].join(','),
      [isRTL ? 'ضريبة القيمة المضافة' : 'VAT on Commission', financialData?.totalVatOnCommission || 0].join(','),
      [isRTL ? 'أرباح مقدمي الخدمة' : 'Provider Earnings', financialData?.totalProviderEarnings || 0].join(','),
      [isRTL ? 'صافي الربح' : 'Net Platform Profit', financialData?.netProfit || 0].join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const ratesDisplay = financialData?.commissionRates
    ? `${isRTL ? 'فعاليات' : 'Events'}: ${financialData.commissionRates.events}% | ${isRTL ? 'خدمات' : 'Services'}: ${financialData.commissionRates.services}% | ${isRTL ? 'تدريب' : 'Training'}: ${financialData.commissionRates.training}%`
    : '';

  const stats = [
    {
      title: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: formatCurrency(financialData?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      subtext: isRTL ? 'جميع الحجوزات' : 'All bookings',
    },
    {
      title: isRTL ? 'عمولة المنصة' : 'Platform Commission',
      value: formatCurrency(financialData?.totalPlatformCommission || 0),
      icon: Percent,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      subtext: ratesDisplay,
    },
    {
      title: isRTL ? 'ضريبة على العمولة' : 'VAT on Commission',
      value: formatCurrency(financialData?.totalVatOnCommission || 0),
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      subtext: isRTL ? 'ضريبة مستخرجة من العمولة' : 'Extracted from commission',
    },
    {
      title: isRTL ? 'صافي ربح المنصة' : 'Net Platform Profit',
      value: formatCurrency(financialData?.netProfit || 0),
      icon: PiggyBank,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      subtext: isRTL ? 'العمولة - الضريبة' : 'Commission - VAT',
    },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <DollarSign className="h-6 w-6 text-primary" />
            {isRTL ? 'لوحة المالية' : 'Financial Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? 'نظرة شاملة على الأداء المالي للمنصة' : 'Comprehensive overview of platform financial performance'}
          </p>
        </div>
      </div>

      {/* Period Selector & Export */}
      <div className={`flex flex-col sm:flex-row justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className={`w-full sm:w-48 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</SelectItem>
            <SelectItem value="month">{isRTL ? 'هذا الشهر' : 'This Month'}</SelectItem>
            <SelectItem value="year">{isRTL ? 'هذا العام' : 'This Year'}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={exportFinancialReport} variant="outline" className={isRTL ? 'flex-row-reverse' : ''}>
          <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'تصدير التقرير' : 'Export Report'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{isRTL ? 'تفصيل الإيرادات' : 'Revenue Breakdown'}</CardTitle>
            <CardDescription>
              {isRTL ? 'إيرادات الفعاليات والخدمات' : 'Events vs Services revenue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>{isRTL ? 'إيرادات الفعاليات' : 'Event Revenue'}</span>
                </div>
                <span className="font-bold">{formatCurrency(financialData?.eventRevenue || 0)}</span>
              </div>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-3 h-3 bg-secondary rounded-full"></div>
                  <span>{isRTL ? 'إيرادات الخدمات' : 'Service Revenue'}</span>
                </div>
                <span className="font-bold">{formatCurrency(financialData?.serviceRevenue || 0)}</span>
              </div>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span>{isRTL ? 'أرباح مقدمي الخدمة' : 'Provider Earnings'}</span>
                </div>
                <span className="font-bold">{formatCurrency(financialData?.totalProviderEarnings || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{isRTL ? 'إحصائيات المحفظة' : 'Wallet Statistics'}</CardTitle>
            <CardDescription>
              {isRTL ? 'عمليات الإيداع والسحب' : 'Deposits and withdrawals'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>{isRTL ? 'إجمالي الإيداعات' : 'Total Deposits'}</span>
                </div>
                <span className="font-bold text-green-600">{formatCurrency(financialData?.totalTopups || 0)}</span>
              </div>
              <div className={`flex items-center justify-between p-4 bg-muted rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span>{isRTL ? 'إجمالي السحوبات' : 'Total Withdrawals'}</span>
                </div>
                <span className="font-bold text-red-600">{formatCurrency(financialData?.totalWithdrawals || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Log */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wallet className="h-5 w-5" />
            {isRTL ? 'سجل المعاملات' : 'Transaction Log'}
          </CardTitle>
          <CardDescription>
            {isRTL ? 'آخر المعاملات المالية' : 'Recent financial transactions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المعرف' : 'ID'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'العمولة' : 'Commission'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!financialData?.recentTransactions || financialData.recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {isRTL ? 'لا توجد معاملات' : 'No transactions found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  financialData.recentTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className={`font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{tx.id.slice(0, 8)}...</TableCell>
                      <TableCell className={`font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{formatCurrency(tx.total_amount || 0)}</TableCell>
                      <TableCell className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{formatCurrency(Number(tx.platform_commission) || 0)}</TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        <Badge variant={tx.status === 'confirmed' || tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status === 'confirmed' 
                            ? (isRTL ? 'مؤكد' : 'Confirmed')
                            : tx.status === 'completed'
                            ? (isRTL ? 'مكتمل' : 'Completed')
                            : (isRTL ? 'معلق' : 'Pending')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                        {new Date(tx.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
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