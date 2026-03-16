import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MapPin, Eye, Edit, Plus, Search, Star, MessageCircle, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { servicesService } from '@/services/supabaseServices';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  provider_id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  category_id: string | null;
  location: string | null;
  location_ar: string | null;
  price: number;
  duration_minutes: number | null;
  status: string;
  image_url: string | null;
  thumbnail_url?: string | null;
  detail_images?: string[] | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  service_requests?: any[];
  rating_summaries?: any[];
}

interface ServiceStats {
  totalServices: number;
  totalRequests: number;
  totalRevenue: number;
  averageRating: number;
  servicesByStatus: {
    active: number;
    pending: number;
    draft: number;
    rejected: number;
  };
}

const ManageServicesPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguageContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ServiceStats>({
    totalServices: 0,
    totalRequests: 0,
    totalRevenue: 0,
    averageRating: 0,
    servicesByStatus: {
      active: 0,
      pending: 0,
      draft: 0,
      rejected: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchStats();
    }
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    try {
      const { data, error } = await servicesService.getByProvider(user.id);
      if (error) throw error;
      setServices((data as unknown as Service[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: t('error'),
        description: t('manageServices.errorFetchingData'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { services: servicesResult, requests: requestsResult } = await servicesService.getProviderStats(user.id);
      
      if (servicesResult.error) throw servicesResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const servicesData = servicesResult.data || [];
      const requestsData = requestsResult.data || [];

      const servicesByStatus = {
        active: servicesData.filter(s => s.status === 'approved').length,
        pending: servicesData.filter(s => s.status === 'pending').length,
        draft: servicesData.filter(s => s.status === 'draft').length,
        rejected: servicesData.filter(s => s.status === 'rejected').length,
      };

      const totalRevenue = requestsData
        .filter(r => r.status === 'accepted' && r.negotiated_price)
        .reduce((sum, r) => sum + (r.negotiated_price || 0), 0);

      setStats({
        totalServices: servicesData.length,
        totalRequests: requestsData.length,
        totalRevenue,
        averageRating: 0,
        servicesByStatus
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">{t('manageServices.statusActive')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('manageServices.statusPending')}</Badge>;
      case 'draft':
        return <Badge variant="outline">{t('manageServices.statusDraft')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('manageServices.statusRejected')}</Badge>;
      default:
        return <Badge variant="outline">{t('manageServices.statusUnknown')}</Badge>;
    }
  };

  const ServiceCard = ({ service }: { service: Service }) => {
    const requestCount = 0;
    const rating = 0;
    const reviewCount = 0;
    
    return (
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/4">
            <img 
              src={service.thumbnail_url || service.image_url || service.detail_images?.[0] || '/placeholder.svg'} 
              alt={service.name} 
              className="w-full h-48 md:h-full object-cover"
            />
          </div>
          <div className="md:w-3/4 p-6">
            <CardHeader className="p-0 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">{language === 'ar' ? (service.name_ar || service.name) : (service.name || service.name_ar)}</CardTitle>
                  <CardDescription className="mb-2">{language === 'ar' ? (service.description_ar || service.description) : (service.description || service.description_ar)}</CardDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{language === 'ar' ? (service.location_ar || service.location) : (service.location || service.location_ar)}</span>
                    </div>
                    <Badge variant="outline">{t('manageServices.service')}</Badge>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-primary">{requestCount}</div>
                  <div className="text-xs text-muted-foreground">{t('manageServices.request')}</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-muted-foreground">{t('manageServices.revenue')}</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{service.price}</div>
                  <div className="text-xs text-muted-foreground">{t('manageServices.riyal')}</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{service.duration_minutes || 0}</div>
                  <div className="text-xs text-muted-foreground">{t('manageServices.minutes')}</div>
                </div>
              </div>

              {rating > 0 && (
                <div className="mb-4 text-sm">
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {rating.toFixed(1)}/5 ({reviewCount} {t('points.review')})
                  </Badge>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild className="gap-2">
                  <Link to={`/service/${service.id}`}>
                    <Eye className="h-4 w-4" />
                    {t('manageServices.view')}
                  </Link>
                </Button>
                {service.status !== 'rejected' && (
                  <>
                    <Button size="sm" variant="outline" asChild className="gap-2">
                      <Link to={`/edit-service/${service.id}`}>
                        <Edit className="h-4 w-4" />
                        {t('manageServices.edit')}
                      </Link>
                    </Button>
                    {service.status === 'approved' && (
                      <Button size="sm" variant="outline" asChild className="gap-2">
                        <Link to={`/service-requests?service=${service.id}`}>
                          <MessageCircle className="h-4 w-4" />
                          {t('manageServices.requests')} ({requestCount})
                        </Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    );
  };

  const getServicesForTab = (tab: string) => {
    switch (tab) {
      case 'active':
        return services.filter(s => s.status === 'approved');
      case 'pending':
        return services.filter(s => s.status === 'pending');
      case 'draft':
        return services.filter(s => s.status === 'draft');
      case 'rejected':
        return services.filter(s => s.status === 'rejected');
      default:
        return [];
    }
  };

  const currentServices = getServicesForTab(activeTab);
  const filteredServices = currentServices.filter(service =>
    (service.name_ar || service.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.location_ar || service.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">{t('manageServices.loading')}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('manageServices.title')}</h1>
              <p className="text-muted-foreground">
                {t('manageServices.subtitle')}
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-service">
                <Plus className="h-4 w-4" />
                {t('manageServices.addNewService')}
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('manageServices.searchServices')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageServices.totalServices')}</CardTitle>
                <div className="text-primary">📋</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">{t('manageServices.registeredServices')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageServices.totalRequests')}</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">{t('manageServices.serviceRequests')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageServices.totalRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRevenue}</div>
                <p className="text-xs text-muted-foreground">{t('manageServices.saudiRiyal')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('manageServices.averageRating')}</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">{t('manageServices.outOf5Stars')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">{t('manageServices.active')} ({stats.servicesByStatus.active})</TabsTrigger>
              <TabsTrigger value="pending">{t('manageServices.pending')} ({stats.servicesByStatus.pending})</TabsTrigger>
              <TabsTrigger value="draft">{t('manageServices.drafts')} ({stats.servicesByStatus.draft})</TabsTrigger>
              <TabsTrigger value="rejected">{t('manageServices.rejected')} ({stats.servicesByStatus.rejected})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredServices.length > 0 ? (
                <div className="space-y-4">
                  {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? t('manageServices.noResults') : 
                        activeTab === 'active' ? t('manageServices.noActiveServices') : 
                        activeTab === 'pending' ? t('manageServices.noPendingServices') : 
                        activeTab === 'draft' ? t('manageServices.noDrafts') : 
                        t('manageServices.noRejectedServices')}
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchTerm ? t('manageServices.tryDifferentSearch') : t('manageServices.createFirstService')}
                    </p>
                    {!searchTerm && (
                      <Button asChild>
                        <Link to="/create-service">{t('manageServices.addNewService')}</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManageServicesPage;
