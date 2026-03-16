import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Wallet } from 'lucide-react';

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

  // Group transactions by month for area chart - FIXED: Earnings vs Withdrawals
  const monthlyData = React.useMemo(() => {
    if (!safeTransactions || safeTransactions.length === 0) return [];
    
    const grouped: Record<string, { earnings: number; withdrawals: number }> = {};
    
    safeTransactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      const date = new Date(tx.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { earnings: 0, withdrawals: 0 };
      }
      
      // Earnings are positive amounts (earning, refund, bonus)
      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        grouped[monthKey].earnings += Math.abs(tx.amount);
      } 
      // Withdrawals are withdrawal transactions only
      else if (tx.type === 'withdraw') {
        grouped[monthKey].withdrawals += Math.abs(tx.amount);
      }
    });

    const earningsLabel = language === 'ar' ? 'الأرباح' : 'Earnings';
    const withdrawalsLabel = language === 'ar' ? 'السحب' : 'Withdrawals';

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }),
        [earningsLabel]: data.earnings,
        [withdrawalsLabel]: data.withdrawals,
      }));
  }, [safeTransactions, language]);

  // Calculate totals for pie chart - FIXED: Earnings vs Withdrawals
  const pieData = React.useMemo(() => {
    const earningsLabel = language === 'ar' ? 'الأرباح' : 'Earnings';
    const withdrawalsLabel = language === 'ar' ? 'السحب' : 'Withdrawals';
    
    if (!safeTransactions || safeTransactions.length === 0) {
      return [
        { name: earningsLabel, value: 0, color: '#22c55e' },
        { name: withdrawalsLabel, value: 0, color: '#3b82f6' },
      ];
    }
    
    const totals = { earnings: 0, withdrawals: 0 };
    
    safeTransactions.forEach(tx => {
      if (tx.status !== 'completed') return;
      
      if (['earning', 'refund', 'bonus'].includes(tx.type)) {
        totals.earnings += Math.abs(tx.amount);
      } else if (tx.type === 'withdraw') {
        totals.withdrawals += Math.abs(tx.amount);
      }
    });

    return [
      { name: earningsLabel, value: totals.earnings, color: '#22c55e' },
      { name: withdrawalsLabel, value: totals.withdrawals, color: '#3b82f6' },
    ];
  }, [safeTransactions, language]);

  // Generate empty state placeholder data when no transactions
  const emptyMonthlyData = React.useMemo(() => {
    if (monthlyData.length > 0) return monthlyData;
    
    const earningsLabel = language === 'ar' ? 'الأرباح' : 'Earnings';
    const withdrawalsLabel = language === 'ar' ? 'السحب' : 'Withdrawals';
    
    // Generate last 3 months placeholder
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }),
        [earningsLabel]: 0,
        [withdrawalsLabel]: 0,
      });
    }
    return months;
  }, [monthlyData, language]);

  const earningsLabel = language === 'ar' ? 'الأرباح' : 'Earnings';
  const withdrawalsLabel = language === 'ar' ? 'السحب' : 'Withdrawals';

  return (
    <div className="grid gap-6 md:grid-cols-2" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Monthly Trend Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 text-base ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            {language === 'ar' ? 'الأرباح والسحب الشهري' : 'Monthly Earnings & Withdrawals'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={emptyMonthlyData}
                margin={{ top: 10, right: isRTL ? 10 : 30, left: isRTL ? 30 : 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickMargin={10}
                  reversed={isRTL}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickMargin={10}
                  orientation={isRTL ? 'right' : 'left'}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    direction: isRTL ? 'rtl' : 'ltr',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ${language === 'ar' ? 'ريال' : 'SAR'}`, '']}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey={earningsLabel}
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey={withdrawalsLabel}
                  stackId="2"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Earnings vs Withdrawals Pie Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 text-base ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wallet className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'نسبة الأرباح والسحب' : 'Earnings vs Withdrawals Ratio'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString()} ${language === 'ar' ? 'ريال' : 'SAR'}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    direction: isRTL ? 'rtl' : 'ltr',
                  }}
                />
                <Legend 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletCharts;
