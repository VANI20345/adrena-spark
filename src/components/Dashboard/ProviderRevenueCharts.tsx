import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguageContext } from "@/contexts/LanguageContext";

interface ProviderRevenueChartsProps {
  providerId: string;
}

const ProviderRevenueCharts = ({ providerId }: ProviderRevenueChartsProps) => {
  const { t, language } = useLanguageContext();
  const [chartType, setChartType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Fetch revenue data
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['provider-revenue', providerId, chartType, selectedDate],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (chartType === 'daily') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (chartType === 'monthly') {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      } else {
        startDate = startOfYear(selectedDate);
        endDate = endOfYear(selectedDate);
      }

      const { data, error } = await supabase
        .from('service_bookings')
        .select('booking_date, total_amount, status')
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .gte('booking_date', startDate.toISOString())
        .lte('booking_date', endDate.toISOString())
        .order('booking_date', { ascending: true });

      if (error) throw error;

      // Process data based on chart type
      if (chartType === 'daily') {
        // Group by hour
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          revenue: 0
        }));

        data?.forEach(booking => {
          const hour = new Date(booking.booking_date).getHours();
          hourlyData[hour].revenue += booking.total_amount;
        });

        return hourlyData;
      } else if (chartType === 'monthly') {
        // Group by day
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyData = days.map(day => ({
          date: format(day, 'dd', { locale: language === 'ar' ? ar : undefined }),
          revenue: 0
        }));

        data?.forEach(booking => {
          const day = new Date(booking.booking_date).getDate();
          dailyData[day - 1].revenue += booking.total_amount;
        });

        return dailyData;
      } else {
        // Group by month
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        const monthlyData = months.map(month => ({
          month: format(month, 'MMM', { locale: language === 'ar' ? ar : undefined }),
          revenue: 0
        }));

        data?.forEach(booking => {
          const month = new Date(booking.booking_date).getMonth();
          monthlyData[month].revenue += booking.total_amount;
        });

        return monthlyData;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenue, 0) || 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">
            {payload[0].value.toLocaleString()} {t('providerDashboard.sar')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('providerDashboard.revenue')}</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('providerDashboard.daily')}</SelectItem>
                <SelectItem value="monthly">{t('providerDashboard.monthly')}</SelectItem>
                <SelectItem value="yearly">{t('providerDashboard.yearly')}</SelectItem>
              </SelectContent>
            </Select>

            {chartType === 'daily' && (
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border rounded-md text-sm"
              />
            )}

            {chartType === 'monthly' && (
              <input
                type="month"
                value={format(selectedDate, 'yyyy-MM')}
                onChange={(e) => setSelectedDate(new Date(e.target.value + '-01'))}
                className="px-3 py-2 border rounded-md text-sm"
              />
            )}

            {chartType === 'yearly' && (
              <Select 
                value={selectedDate.getFullYear().toString()} 
                onValueChange={(value) => setSelectedDate(new Date(parseInt(value), 0, 1))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <p className="text-2xl font-bold text-primary mt-2">
          {totalRevenue.toLocaleString()} {t('providerDashboard.sar')}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'daily' ? (
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : chartType === 'monthly' ? (
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderRevenueCharts;
