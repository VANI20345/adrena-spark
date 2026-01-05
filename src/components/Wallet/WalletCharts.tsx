import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface WalletChartsProps {
  transactions: Transaction[];
}

const WalletCharts = ({ transactions }: WalletChartsProps) => {
  const { t, isRTL, language } = useLanguageContext();

  // Ensure transactions is always an array (null safety)
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Group transactions by month for area chart
  const monthlyData = React.useMemo(() => {
    if (!safeTransactions || safeTransactions.length === 0) return [];
    
    const grouped: Record<string, { income: number; expenses: number }> = {};
    
    safeTransactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      const date = new Date(tx.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        grouped[monthKey].income += Math.abs(tx.amount);
      } else {
        grouped[monthKey].expenses += Math.abs(tx.amount);
      }
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }),
        [t('wallet.income') || 'Income']: data.income,
        [t('wallet.expenses') || 'Expenses']: data.expenses,
      }));
  }, [safeTransactions, language, t]);

  // Calculate totals for pie chart
  const pieData = React.useMemo(() => {
    if (!safeTransactions || safeTransactions.length === 0) {
      return [
        { name: t('wallet.income') || 'Income', value: 0, color: '#22c55e' },
        { name: t('wallet.expenses') || 'Expenses', value: 0, color: '#ef4444' },
      ];
    }
    
    const totals = { income: 0, expenses: 0 };
    
    safeTransactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        totals.income += Math.abs(tx.amount);
      } else {
        totals.expenses += Math.abs(tx.amount);
      }
    });

    return [
      { name: t('wallet.income') || 'Income', value: totals.income, color: '#22c55e' },
      { name: t('wallet.expenses') || 'Expenses', value: totals.expenses, color: '#ef4444' },
    ];
  }, [safeTransactions, t]);

  // Calculate transaction type breakdown
  const typeBreakdown = React.useMemo(() => {
    if (!safeTransactions || safeTransactions.length === 0) return [];
    
    const breakdown: Record<string, number> = {};
    
    safeTransactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      breakdown[tx.type] = (breakdown[tx.type] || 0) + Math.abs(tx.amount);
    });

    const colors = {
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
      color: colors[type as keyof typeof colors] || '#6b7280',
    }));
  }, [safeTransactions, t]);

  if (safeTransactions.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('wallet.monthlyTrend') || 'Monthly Trend'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  reversed={isRTL}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  orientation={isRTL ? 'right' : 'left'}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={t('wallet.income') || 'Income'}
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey={t('wallet.expenses') || 'Expenses'}
                  stackId="2"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Income vs Expenses Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            {t('wallet.incomeVsExpenses') || 'Income vs Expenses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} ${t('wallet.riyal')}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Type Breakdown */}
      {typeBreakdown.length > 2 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('wallet.transactionBreakdown') || 'Transaction Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {typeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} ${t('wallet.riyal')}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletCharts;
