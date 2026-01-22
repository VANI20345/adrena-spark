import React, { useState, useCallback } from 'react';
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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const VAT_RATE = 0.15; // 15% VAT

export const FinancialDashboardTab = () => {
  const { isRTL } = useLanguageContext();
  const [period, setPeriod] = useState<string>('month');

  const { data: financialData, isLoading } = useSupabaseQuery({
    queryKey: ['financial-dashboard', period],
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

      // Get bookings for the period
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_amount, vat_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'confirmed');

      // Get service bookings
      const { data: serviceBookings } = await supabase
        .from('service_bookings')
        .select('id, total_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'confirmed');

      // Get wallet transactions
      const { data: walletTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Calculate totals
      const eventRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const serviceRevenue = serviceBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalRevenue = eventRevenue + serviceRevenue;
      
      // VAT is 15% of the revenue
      const totalVat = bookings?.reduce((sum, b) => sum + (b.vat_amount || 0), 0) || 0;
      
      // Commission is typically 15% of the base (before VAT)
      const baseAmount = totalRevenue / (1 + VAT_RATE);
      const estimatedCommission = baseAmount * 0.15;
      
      // Net profit after expenses (estimated)
      const netProfit = estimatedCommission - (estimatedCommission * 0.1); // 10% operational costs

      // Wallet stats
      const totalTopups = walletTransactions?.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const totalWithdrawals = walletTransactions?.filter(t => t.type === 'withdraw').reduce((s, t) => s + Math.abs(t.amount || 0), 0) || 0;

      return {
        totalRevenue,
        eventRevenue,
        serviceRevenue,
        totalVat,
        estimatedCommission,
        netProfit,
        totalTopups,
        totalWithdrawals,
        transactionsCount: (bookings?.length || 0) + (serviceBookings?.length || 0),
        recentTransactions: [...(bookings || []), ...(serviceBookings || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10),
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${isRTL ? 'ريال' : 'SAR'}`;
  };

  const exportFinancialReport = () => {
    const csvContent = [
      ['Metric', 'Value'].join(','),
      ['Total Revenue', financialData?.totalRevenue || 0].join(','),
      ['Event Revenue', financialData?.eventRevenue || 0].join(','),
      ['Service Revenue', financialData?.serviceRevenue || 0].join(','),
      ['Total VAT (15%)', financialData?.totalVat || 0].join(','),
      ['Platform Commission', financialData?.estimatedCommission || 0].join(','),
      ['Net Profit', financialData?.netProfit || 0].join(','),
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
      value: formatCurrency(financialData?.estimatedCommission || 0),
      icon: Percent,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      subtext: '15%',
    },
    {
      title: isRTL ? 'ضريبة القيمة المضافة' : 'VAT Amount',
      value: formatCurrency(financialData?.totalVat || 0),
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      subtext: '15%',
    },
    {
      title: isRTL ? 'صافي الربح' : 'Net Profit',
      value: formatCurrency(financialData?.netProfit || 0),
      icon: PiggyBank,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      subtext: isRTL ? 'بعد المصروفات' : 'After expenses',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector & Export */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-48">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</SelectItem>
            <SelectItem value="month">{isRTL ? 'هذا الشهر' : 'This Month'}</SelectItem>
            <SelectItem value="year">{isRTL ? 'هذا العام' : 'This Year'}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={exportFinancialReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {isRTL ? 'تصدير التقرير' : 'Export Report'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
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
          <CardHeader>
            <CardTitle>{isRTL ? 'تفصيل الإيرادات' : 'Revenue Breakdown'}</CardTitle>
            <CardDescription>
              {isRTL ? 'إيرادات الفعاليات والخدمات' : 'Events vs Services revenue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>{isRTL ? 'إيرادات الفعاليات' : 'Event Revenue'}</span>
                </div>
                <span className="font-bold">{formatCurrency(financialData?.eventRevenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-secondary rounded-full"></div>
                  <span>{isRTL ? 'إيرادات الخدمات' : 'Service Revenue'}</span>
                </div>
                <span className="font-bold">{formatCurrency(financialData?.serviceRevenue || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? 'إحصائيات المحفظة' : 'Wallet Statistics'}</CardTitle>
            <CardDescription>
              {isRTL ? 'عمليات الإيداع والسحب' : 'Deposits and withdrawals'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>{isRTL ? 'إجمالي الإيداعات' : 'Total Deposits'}</span>
                </div>
                <span className="font-bold text-green-600">{formatCurrency(financialData?.totalTopups || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialData?.recentTransactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {isRTL ? 'لا توجد معاملات' : 'No transactions found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  financialData?.recentTransactions?.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-bold">{formatCurrency(tx.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'confirmed' ? 'default' : 'secondary'}>
                          {tx.status === 'confirmed' 
                            ? (isRTL ? 'مؤكد' : 'Confirmed')
                            : (isRTL ? 'معلق' : 'Pending')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
