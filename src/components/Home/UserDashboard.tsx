import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Star, TrendingUp, Plus, Eye, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { DashboardStats } from '@/components/Dashboard/DashboardStats';

const UserDashboard = () => {
  const { userRole } = useAuth();
  const { t } = useLanguageContext();

  const AttendeeDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t('index.welcomeBack')}</h2>
        <p className="text-muted-foreground">{t('index.discoverEvents')}</p>
      </div>

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('dashboardPage.quickStats')}</h3>
        <DashboardStats userRole="attendee" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboardPage.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/explore" className="flex items-center gap-3">
                <Eye className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('dashboardPage.exploreEvents')}</div>
                  <div className="text-sm text-muted-foreground">{t('explore.title')}</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/my-events" className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('myEvents.title')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboardPage.bookingHistory')}</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const OrganizerDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t('organizerDashboard.title')}</h2>
        <p className="text-muted-foreground">{t('organizerDashboard.subtitle')}</p>
      </div>

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('dashboardPage.analytics')}</h3>
        <DashboardStats userRole="attendee" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboardPage.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/create-event" className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('createEvent.title')}</div>
                  <div className="text-sm text-muted-foreground">{t('createEvent.basicInfo')}</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/manage-events" className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('manageEvents.title')}</div>
                  <div className="text-sm text-muted-foreground">{t('manageEvents.subtitle')}</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>{t('organizerDashboard.recentEvents')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                لا توجد فعاليات حديثة لعرضها. قم بإنشاء فعالية جديدة لبدء رحلتك في التنظيم.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/create-event">
                  إنشاء فعالية جديدة
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ProviderDashboard = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t('providerDashboard.title')}</h2>
        <p className="text-muted-foreground">{t('providerDashboard.subtitle')}</p>
      </div>

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('dashboardPage.analytics')}</h3>
        <DashboardStats userRole="provider" />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboardPage.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-auto p-4 justify-start">
              <Link to="/create-service" className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('createService.title')}</div>
                  <div className="text-sm text-muted-foreground">{t('createService.basicInfo')}</div>
                </div>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link to="/manage-services" className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div className="text-right">
                  <div className="font-semibold">{t('manageServices.title')}</div>
                  <div className="text-sm text-muted-foreground">{t('manageServices.subtitle')}</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Services */}
      <Card>
        <CardHeader>
          <CardTitle>{t('providerDashboard.recentServices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                لا توجد خدمات مضافة حالياً. قم بإضافة خدمتك الأولى لبدء عملك كمقدم خدمات.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/create-service">
                  إضافة خدمة جديدة
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (userRole) {
    case 'attendee':
      return (
        <>
          <AttendeeDashboard />
          <div className="mt-6">
            <OrganizerDashboard />
          </div>
        </>
      );
    case 'provider':
      return <ProviderDashboard />;
    default:
      return null;
  }
};

export default UserDashboard;