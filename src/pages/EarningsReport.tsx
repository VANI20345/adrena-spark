import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  ArrowRight,
  Calendar,
  Download,
  Wallet
} from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const EarningsReport = () => {
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguageContext();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const dateLocale = language === 'ar' ? ar : enUS;

  // Fetch transactions
  const { data: rawTransactions, isLoading } = useSupabaseQuery({
    queryKey: ['earnings_report', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }, [user?.id]),
    enabled: !!user?.id
  });

  // Ensure transactions is always an array
  const transactions = rawTransactions ?? [];

  // Filter data based on period
  const filteredData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    let startDate: Date;
    let endDate = new Date();

    switch (period) {
      case 'week':
        startDate = subDays(new Date(), 7);
        break;
      case 'month':
        startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        endDate = endOfMonth(new Date(selectedYear, selectedMonth));
        break;
      case 'year':
        startDate = startOfYear(new Date(selectedYear, 0));
        endDate = endOfYear(new Date(selectedYear, 0));
        break;
      default:
        startDate = subDays(new Date(), 30);
    }

    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate >= startDate && txDate <= endDate && tx.status === 'completed';
    });
  }, [transactions, period, selectedMonth, selectedYear]);

  // Prepare chart data based on period
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const grouped: Record<string, { income: number; expenses: number; date: Date }> = {};

    filteredData.forEach(tx => {
      const date = new Date(tx.created_at);
      let key: string;

      if (period === 'week' || period === 'month') {
        key = format(date, 'yyyy-MM-dd');
      } else {
        key = format(date, 'yyyy-MM');
      }

      if (!grouped[key]) {
        grouped[key] = { income: 0, expenses: 0, date };
      }

      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        grouped[key].income += Math.abs(tx.amount);
      } else {
        grouped[key].expenses += Math.abs(tx.amount);
      }
    });

    // Fill in missing dates
    let dates: Date[];
    if (period === 'week') {
      dates = eachDayOfInterval({ start: subDays(new Date(), 7), end: new Date() });
    } else if (period === 'month') {
      dates = eachDayOfInterval({
        start: startOfMonth(new Date(selectedYear, selectedMonth)),
        end: endOfMonth(new Date(selectedYear, selectedMonth))
      });
    } else {
      dates = eachMonthOfInterval({
        start: startOfYear(new Date(selectedYear, 0)),
        end: endOfYear(new Date(selectedYear, 0))
      });
    }

    return dates.map(date => {
      const key = period === 'year' ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd');
      const data = grouped[key] || { income: 0, expenses: 0 };
      
      return {
        label: period === 'year' 
          ? format(date, 'MMM', { locale: dateLocale })
          : format(date, 'd', { locale: dateLocale }),
        fullDate: format(date, 'PP', { locale: dateLocale }),
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      };
    });
  }, [filteredData, period, selectedMonth, selectedYear, dateLocale]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredData.reduce((acc, tx) => {
      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        acc.income += Math.abs(tx.amount);
      } else {
        acc.expenses += Math.abs(tx.amount);
      }
      return acc;
    }, { income: 0, expenses: 0 });
  }, [filteredData]);

  // Transaction type breakdown
  const typeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    
    filteredData.forEach(tx => {
      breakdown[tx.type] = (breakdown[tx.type] || 0) + Math.abs(tx.amount);
    });

    const colors: Record<string, string> = {
      earning: '#22c55e',
      payment: '#ef4444',
      withdraw: '#3b82f6',
      refund: '#10b981',
      commission: '#f97316',
      bonus: '#8b5cf6',
    };

    return Object.entries(breakdown).map(([type, value]) => ({
      name: t(`wallet.${type}`) || type,
      value,
      color: colors[type] || '#6b7280',
    }));
  }, [filteredData, t]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: dateLocale })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
                {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{t('wallet.earningsReport')}</h1>
                <p className="text-muted-foreground">
                  {t('wallet.earningsReportDesc')}
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              {t('wallet.export')}
            </Button>
          </div>

          {/* Period Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                  <TabsList>
                    <TabsTrigger value="week">{t('wallet.week')}</TabsTrigger>
                    <TabsTrigger value="month">{t('wallet.month')}</TabsTrigger>
                    <TabsTrigger value="year">{t('wallet.year')}</TabsTrigger>
                  </TabsList>
                </Tabs>

                {period === 'month' && (
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {period === 'year' && (
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.totalIncome')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{totals.income.toLocaleString()} {t('wallet.riyal')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.totalExpenses')}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{totals.expenses.toLocaleString()} {t('wallet.riyal')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('wallet.netBalance')}</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totals.income - totals.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.income - totals.expenses >= 0 ? '+' : ''}
                  {(totals.income - totals.expenses).toLocaleString()} {t('wallet.riyal')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {isRTL ? 'الأرباح عبر الزمن' : 'Earnings Over Time'}
              </CardTitle>
              <CardDescription>
                {period === 'week' && (isRTL ? 'آخر 7 أيام' : 'Last 7 days')}
                {period === 'month' && months.find(m => m.value === selectedMonth)?.label + ' ' + selectedYear}
                {period === 'year' && selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 || chartData.every(d => d.income === 0 && d.expenses === 0) ? (
                <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
                  <Wallet className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {isRTL ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}
                  </p>
                  <p className="text-sm">
                    {isRTL ? 'ستظهر البيانات هنا عند وجود معاملات' : 'Data will appear here when transactions exist'}
                  </p>
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        reversed={isRTL}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        orientation={isRTL ? 'right' : 'left'}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border rounded-lg p-3 shadow-lg">
                                <p className="font-medium mb-2">{payload[0]?.payload?.fullDate}</p>
                                {payload.map((entry, index) => (
                                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                                    {entry.name}: {Number(entry.value).toLocaleString()} {isRTL ? 'ريال' : 'SAR'}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name={isRTL ? 'الدخل' : 'Income'}
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name={isRTL ? 'المصروفات' : 'Expenses'}
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secondary Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Net Balance Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'اتجاه صافي الرصيد' : 'Net Balance Trend'}</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 || chartData.every(d => d.net === 0) ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          reversed={isRTL}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          orientation={isRTL ? 'right' : 'left'}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} ${isRTL ? 'ريال' : 'SAR'}`, isRTL ? 'صافي الرصيد' : 'Net Balance']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="net"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'تفصيل المعاملات' : 'Transaction Breakdown'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {typeBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {typeBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `${value.toLocaleString()} ${isRTL ? 'ريال' : 'SAR'}`}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <TrendingDown className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">{isRTL ? 'لا توجد معاملات' : 'No transactions'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bar Chart Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? 'المقارنة اليومية' : 'Daily Comparison'}</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 || chartData.every(d => d.income === 0 && d.expenses === 0) ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">{isRTL ? 'لا توجد بيانات للمقارنة' : 'No data for comparison'}</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        reversed={isRTL}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        orientation={isRTL ? 'right' : 'left'}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border rounded-lg p-3 shadow-lg">
                                <p className="font-medium mb-2">{payload[0]?.payload?.fullDate}</p>
                                {payload.map((entry, index) => (
                                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                                    {entry.name}: {Number(entry.value).toLocaleString()} {isRTL ? 'ريال' : 'SAR'}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name={isRTL ? 'الدخل' : 'Income'} fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name={isRTL ? 'المصروفات' : 'Expenses'} fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default EarningsReport;
