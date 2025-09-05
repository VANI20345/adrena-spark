import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  Package,
  DollarSign,
  Plus,
  TrendingUp,
  MapPin,
  Clock,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Handshake
} from 'lucide-react';

const ProviderDashboard = () => {
  const { userRole, user, loading } = useAuth();
  const [stats, setStats] = useState({
    activeServices: 0,
    totalRequests: 0,
    totalEarnings: 0,
    averageRating: 0
  });
  const [myServices, setMyServices] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  useEffect(() => {
    if (userRole === 'provider' && user) {
      loadProviderData();
    }
  }, [userRole, user]);

  const loadProviderData = async () => {
    try {
      // Load provider's services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id);

      // Load service requests for provider's services
      const { data: requestsData } = await supabase
        .from('service_requests')
        .select(`
          *,
          services!inner(provider_id, name_ar),
          events(title_ar)
        `)
        .eq('provider_id', user.id);

      // Calculate stats
      const activeServices = servicesData?.filter(service => service.status === 'active').length || 0;
      const totalRequests = requestsData?.length || 0;
      const totalEarnings = requestsData?.reduce((sum, request) => 
        sum + (request.negotiated_price || request.requested_price || 0), 0
      ) || 0;

      setStats({
        activeServices,
        totalRequests,
        totalEarnings,
        averageRating: 4.5 // This would come from reviews
      });

      setMyServices(servicesData || []);
      setServiceRequests(requestsData || []);

    } catch (error) {
      console.error('Error loading provider data:', error);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject', negotiatedPrice?: number) => {
    try {
      const updateData: any = { status: action === 'accept' ? 'accepted' : 'rejected' };
      if (negotiatedPrice) {
        updateData.negotiated_price = negotiatedPrice;
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', requestId);
      
      if (!error) {
        loadProviderData();
      }
    } catch (error) {
      console.error('Error updating service request:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'provider') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة مقدم الخدمة</h1>
          <p className="text-muted-foreground">إدارة خدماتك وطلبات الربط</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="services">خدماتي</TabsTrigger>
            <TabsTrigger value="requests">طلبات الربط</TabsTrigger>
            <TabsTrigger value="earnings">الأرباح</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الخدمات النشطة</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeServices}</div>
                  <p className="text-xs text-muted-foreground">+1 عن الشهر الماضي</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">طلبات الربط</CardTitle>
                  <Handshake className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests}</div>
                  <p className="text-xs text-muted-foreground">+5 هذا الأسبوع</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)} ر.س</div>
                  <p className="text-xs text-muted-foreground">+15% عن الشهر الماضي</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageRating}/5</div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-4 h-4 ${star <= stats.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إجراءات سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full">
                    <Link to="/create-service">
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة خدمة جديدة
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 ml-2" />
                    تحليل الأداء
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 ml-2" />
                    رسائل العملاء
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>طلبات الربط الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceRequests.slice(0, 5).map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{request.events?.title_ar}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.requested_price} ر.س مقترحة
                          </p>
                        </div>
                        <Badge variant={
                          request.status === 'accepted' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {request.status === 'accepted' ? 'مقبول' : 
                           request.status === 'rejected' ? 'مرفوض' : 'معلق'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">خدماتي</h2>
              <Button asChild>
                <Link to="/create-service">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة خدمة جديدة
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myServices.map((service: any) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                        {service.status === 'active' ? 'نشط' : service.status === 'pending' ? 'معلق' : 'غير نشط'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{service.name_ar}</CardTitle>
                    <CardDescription>{service.description_ar}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 ml-2" />
                        {service.location_ar}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-2" />
                        {service.duration_minutes} دقيقة
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 ml-2" />
                        {service.price} ر.س
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline">عرض</Button>
                      <Button size="sm" variant="outline">تعديل</Button>
                      <Button size="sm" variant="outline">إحصائيات</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>طلبات ربط الخدمات</CardTitle>
                <CardDescription>طلبات المنظمين لربط خدماتك بفعالياتهم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceRequests.map((request: any) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold">{request.events?.title_ar}</h4>
                          <p className="text-sm text-muted-foreground">
                            خدمة: {request.services?.name_ar}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.message}
                          </p>
                        </div>
                        <Badge variant={
                          request.status === 'accepted' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {request.status === 'accepted' ? 'مقبول' : 
                           request.status === 'rejected' ? 'مرفوض' : 'معلق'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm">
                          <span>السعر المقترح: {request.requested_price} ر.س</span>
                          {request.negotiated_price && (
                            <span className="mx-2">• السعر المتفاوض: {request.negotiated_price} ر.س</span>
                          )}
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleRequestAction(request.id, 'accept')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRequestAction(request.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 ml-1" />
                            تفاوض
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 ml-1" />
                            عرض الفعالية
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ملخص الأرباح</CardTitle>
                <CardDescription>تفاصيل أرباحك من الخدمات</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">تفاصيل الأرباح قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تقييمات الخدمات</CardTitle>
                <CardDescription>تقييمات العملاء لخدماتك</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">نظام التقييمات قيد التطوير</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;