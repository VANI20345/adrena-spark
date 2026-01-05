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

  // Empty state
  if (revenueData.length === 0 && bookingsData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">{t('admin.reports.noDataAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(2)} ${t('admin.reports.riyal')}`}
                contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={2}
                name={t('admin.reports.revenue')}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name={t('admin.reports.bookings')} />
            </BarChart>
          </ResponsiveContainer>
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
