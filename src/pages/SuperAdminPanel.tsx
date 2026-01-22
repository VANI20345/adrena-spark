import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { SuperAdminOverviewTab } from '@/components/SuperAdmin/SuperAdminOverviewTab';
import { RoleManagementTab } from '@/components/SuperAdmin/RoleManagementTab';
import { AdminPerformanceTab } from '@/components/SuperAdmin/AdminPerformanceTab';
import { FinancialDashboardTab } from '@/components/SuperAdmin/FinancialDashboardTab';
import { SuperAdminActivityLogsTab } from '@/components/SuperAdmin/SuperAdminActivityLogsTab';
import { EventActivationTab } from '@/components/SuperAdmin/EventActivationTab';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  DollarSign, 
  FileText, 
  CalendarCheck,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SuperAdminPanel = () => {
  const { userRole, loading: authLoading } = useAuth();
  const { language, t, isRTL } = useLanguageContext();
  const [activeTab, setActiveTab] = useState("overview");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'overview', icon: LayoutDashboard, labelAr: 'نظرة عامة', labelEn: 'Overview' },
    { id: 'event-activation', icon: CalendarCheck, labelAr: 'تفعيل الفعاليات', labelEn: 'Event Activation' },
    { id: 'role-management', icon: Shield, labelAr: 'إدارة الصلاحيات', labelEn: 'Role Management' },
    { id: 'admin-performance', icon: BarChart3, labelAr: 'أداء المشرفين', labelEn: 'Admin Performance' },
    { id: 'financials', icon: DollarSign, labelAr: 'لوحة المالية', labelEn: 'Financial Dashboard' },
    { id: 'activity-logs', icon: FileText, labelAr: 'سجل النشاطات', labelEn: 'Activity Logs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className={`flex-1 container mx-auto px-4 py-8`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {isRTL ? 'لوحة تحكم المشرف الأعلى' : 'Super Admin Panel'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة شاملة للنظام والصلاحيات والمالية' : 'Comprehensive system, role, and financial management'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full h-auto flex-wrap gap-2 p-2 bg-muted rounded-lg">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {isRTL ? tab.labelAr : tab.labelEn}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <SuperAdminOverviewTab />
          </TabsContent>

          <TabsContent value="event-activation">
            <EventActivationTab />
          </TabsContent>

          <TabsContent value="role-management">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="admin-performance">
            <AdminPerformanceTab />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialDashboardTab />
          </TabsContent>

          <TabsContent value="activity-logs">
            <SuperAdminActivityLogsTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default SuperAdminPanel;
