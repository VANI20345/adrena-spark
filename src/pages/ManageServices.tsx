import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MapPin, Eye, Edit, Trash2, Plus, Search, Star, MessageCircle, Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
        title: "خطأ",
        description: "حدث خطأ في جلب البيانات",
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

      // Calculate stats
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
        averageRating: 0, // This would need to be calculated from rating_summaries
        servicesByStatus
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">نشط</Badge>;
      case 'pending':
        return <Badge variant="secondary">قيد المراجعة</Badge>;
      case 'draft':
        return <Badge variant="outline">مسودة</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const ServiceCard = ({ service }: { service: Service }) => {
    const requestCount = 0; // Will fetch separately when needed
    const rating = 0; // Will fetch separately when needed
    const reviewCount = 0; // Will fetch separately when needed
    
    return (
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/4">
            <img 
              src={service.image_url || '/placeholder.svg'} 
              alt={service.name} 
              className="w-full h-48 md:h-full object-cover"
            />
          </div>
          <div className="md:w-3/4 p-6">
            <CardHeader className="p-0 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">{service.name_ar || service.name}</CardTitle>
                  <CardDescription className="mb-2">{service.description_ar || service.description}</CardDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{service.location_ar || service.location}</span>
                    </div>
                    <Badge variant="outline">خدمة</Badge>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-primary">{requestCount}</div>
                  <div className="text-xs text-muted-foreground">طلب</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-muted-foreground">الإيرادات</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{service.price}</div>
                  <div className="text-xs text-muted-foreground">ريال</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{service.duration_minutes || 0}</div>
                  <div className="text-xs text-muted-foreground">دقيقة</div>
                </div>
              </div>

              {rating > 0 && (
                <div className="mb-4 text-sm">
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {rating.toFixed(1)}/5 ({reviewCount} تقييم)
                  </Badge>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild className="gap-2">
                  <Link to={`/service-details/${service.id}`}>
                    <Eye className="h-4 w-4" />
                    عرض
                  </Link>
                </Button>
                {service.status !== 'rejected' && (
                  <>
                    <Button size="sm" variant="outline" asChild className="gap-2">
                      <Link to={`/create-service?edit=${service.id}`}>
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Link>
                    </Button>
                    {service.status === 'approved' && (
                      <>
                        <Button size="sm" variant="outline" asChild className="gap-2">
                          <Link to={`/service-requests?service=${service.id}`}>
                            <MessageCircle className="h-4 w-4" />
                            الطلبات ({requestCount})
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="gap-2"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
                              // Handle deletion
                              toast({
                                title: "تنبيه",
                                description: "وظيفة حذف الخدمة قيد التطوير",
                                variant: "default",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </Button>
                      </>
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
          <div className="text-center">جاري التحميل...</div>
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
              <h1 className="text-3xl font-bold mb-2">إدارة الخدمات</h1>
              <p className="text-muted-foreground">
                إدارة وتتبع جميع خدماتك
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-service">
                <Plus className="h-4 w-4" />
                إضافة خدمة جديدة
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الخدمات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
                <div className="text-primary">📋</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">خدمة مسجلة</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">طلب خدمة</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRevenue}</div>
                <p className="text-xs text-muted-foreground">ريال سعودي</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">من 5 نجوم</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">النشطة ({stats.servicesByStatus.active})</TabsTrigger>
              <TabsTrigger value="pending">قيد المراجعة ({stats.servicesByStatus.pending})</TabsTrigger>
              <TabsTrigger value="draft">المسودات ({stats.servicesByStatus.draft})</TabsTrigger>
              <TabsTrigger value="rejected">المرفوضة ({stats.servicesByStatus.rejected})</TabsTrigger>
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
                      {searchTerm ? 'لا توجد نتائج' : `لا توجد خدمات ${activeTab === 'active' ? 'نشطة' : activeTab === 'pending' ? 'قيد المراجعة' : activeTab === 'draft' ? 'مسودات' : 'مرفوضة'}`}
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchTerm ? 'جرب البحث بكلمات أخرى' : 'ابدأ بإضافة أول خدمة لك'}
                    </p>
                    {!searchTerm && (
                      <Button asChild>
                        <Link to="/create-service">إضافة خدمة جديدة</Link>
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