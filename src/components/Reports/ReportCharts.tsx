import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users } from 'lucide-react';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ReportChartsProps {
  revenueData: ChartData[];
  bookingsData: ChartData[];
  categoriesData?: ChartData[];
  title: string;
  isLoading?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ReportCharts: React.FC<ReportChartsProps> = ({
  revenueData,
  bookingsData,
  categoriesData,
  title,
  isLoading = false
}) => {
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - show empty charts instead of no data message
  const hasRevenueData = revenueData && revenueData.length > 0;
  const hasBookingsData = bookingsData && bookingsData.length > 0;

  // If both are empty, show placeholder data for demonstration
  const displayRevenueData = hasRevenueData ? revenueData : [{ name: isRTL ? 'لا توجد بيانات' : 'No data', value: 0 }];
  const displayBookingsData = hasBookingsData ? bookingsData : [{ name: isRTL ? 'لا توجد بيانات' : 'No data', value: 0 }];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Revenue Line Chart */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 text-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('admin.reports.revenueOverTime')}
          </CardTitle>
          <CardDescription>{t('admin.reports.revenueEvolution')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayRevenueData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)} ${t('admin.reports.riyal')}`, t('admin.reports.revenue')]}
                  contentStyle={{ 
                    direction: isRTL ? 'rtl' : 'ltr',
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name={t('admin.reports.revenue')}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Bar Chart */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 text-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {t('admin.reports.bookingsCount')}
          </CardTitle>
          <CardDescription>{t('admin.reports.bookingsStats')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayBookingsData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    direction: isRTL ? 'rtl' : 'ltr',
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  name={t('admin.reports.bookings')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Categories Pie Chart (if provided) */}
      {categoriesData && categoriesData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 text-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Users className="h-5 w-5 text-purple-600" />
              {t('admin.reports.categoryDistribution')}
            </CardTitle>
            <CardDescription>{t('admin.reports.categoryBookingsDistribution')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
