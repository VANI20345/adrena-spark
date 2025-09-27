import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Wallet,
  Plus,
  Eye,
  Settings,
  MessageSquare,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react';
import { servicesService, profilesService } from '@/services/supabaseServices';
import { serviceBookingService } from '@/services/serviceBookingService';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Service {
  id: string;
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
}

interface ServiceRequest {
  id: string;
  event_id: string;
  service_id: string;
  organizer_id: string;
  provider_id: string;
  requested_price: number | null;
  negotiated_price: number | null;
  status: string;
  message: string | null;
  response_message: string | null;
  created_at: string;
  updated_at: string;
  events?: {
    title: string;
    title_ar: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface Stats {
  totalServices: number;
  totalRevenue: number;
  totalBookings: number;
  activeServices: number;
  avgRating: number;
}

const ProviderDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceBookings, setServiceBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalServices: 0,
    totalRevenue: 0,
    totalBookings: 0,
    activeServices: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProviderData();
    }
  }, [user]);

  const fetchProviderData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch services
      const { data: servicesData, error: servicesError } = await servicesService.getByProvider(user.id);
      if (servicesError) throw servicesError;
      
      // Fetch service requests and stats  
      const { services: servicesResult, requests: requestsResult } = await servicesService.getProviderStats(user.id);
      
      // Fetch service bookings and revenue
      const [bookingsResult, revenueResult] = await Promise.all([
        serviceBookingService.getProviderBookings(user.id),
        serviceBookingService.getProviderRevenue(user.id)
      ]);
      
      if (servicesResult.error) throw servicesResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const servicesStats = servicesResult.data || [];
      const requestsData = requestsResult.data || [];

      setServices((servicesData as unknown as Service[]) || []);
      setServiceRequests((requestsData as unknown as ServiceRequest[]) || []);
      
      if (bookingsResult.data) {
        setServiceBookings(bookingsResult.data);
      }

      // Calculate stats including revenue from service bookings
      const activeServices = servicesStats.filter(s => s.status === 'approved').length;
      const requestRevenue = requestsData
        .filter(r => r.status === 'accepted' && r.negotiated_price)
        .reduce((sum, r) => sum + (r.negotiated_price || 0), 0);
      
      const serviceRevenue = revenueResult.totalRevenue || 0;
      const totalRevenue = requestRevenue + serviceRevenue;

      setStats({
        totalServices: servicesStats.length,
        totalRevenue,
        totalBookings: (requestsData.filter(r => r.status === 'accepted').length + (revenueResult.totalBookings || 0)),
        activeServices,
        avgRating: 0 // Would need to calculate from ratings
      });

    } catch (error) {
      console.error('Error fetching provider data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await serviceBookingService.updateStatus(bookingId, status);
      if (error) throw error;
      
      toast({
        title: "تم تحديث الحجز",
        description: `تم ${status === 'confirmed' ? 'تأكيد' : status === 'completed' ? 'إكمال' : 'إلغاء'} الحجز بنجاح`,
      });
      
      // Refresh data
      fetchProviderData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الحجز",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                مرحباً، {profile?.full_name || 'مقدم الخدمة'}!
              </h1>
              <p className="text-muted-foreground">
                إدارة خدماتك ومتابعة طلبات المنظمين
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-service">
                <Plus className="h-4 w-4" />
                إضافة خدمة جديدة
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">
                  +1 هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalRevenue.toLocaleString()} ريال
                </div>
                <p className="text-xs text-muted-foreground">
                  +20% من الشهر الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  +12 هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الخدمات النشطة</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.activeServices}</div>
                <p className="text-xs text-muted-foreground">
                  متاحة للحجز
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.avgRating}</div>
                <p className="text-xs text-muted-foreground">
                  من 5 نجوم
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  خدماتي النشطة
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                الخدمات المتاحة للحجز حالياً
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : services.length > 0 ? (
                <div className="space-y-4">
                  {services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={service.name_ar || service.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold">{service.name_ar || service.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>خدمة</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {service.location_ar || service.location || 'غير محدد'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={service.status === 'approved' ? 'default' : 'secondary'}>
                            {service.status === 'approved' ? 'نشط' : 
                             service.status === 'pending' ? 'قيد المراجعة' : 'غير نشط'}
                          </Badge>
                          {service.featured && (
                            <Badge variant="outline">مميز</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <p className="font-semibold">{service.price} ريال</p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration_minutes ? `${service.duration_minutes} دقيقة` : 'سعر الخدمة'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to={`/service/${service.id}`}>
                            <Eye className="h-3 w-3" />
                            عرض
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to="/manage-services">
                            <Settings className="h-3 w-3" />
                            إدارة
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد خدمات حالياً
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  طلبات الخدمة
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                طلبات ربط الخدمات الواردة من المنظمين
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : serviceRequests.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            {request.events?.title_ar || request.events?.title || 'فعالية غير محددة'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {request.profiles?.full_name || 'منظم غير محدد'}
                          </p>
                        </div>
                        <Badge variant={request.status === 'pending' ? 'secondary' : 'default'}>
                          {request.status === 'pending' ? 'قيد المراجعة' : 
                           request.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">السعر المطلوب:</span>
                          <span className="font-medium">
                            {request.requested_price ? `${request.requested_price} ريال` : 'غير محدد'}
                          </span>
                        </div>
                        {request.negotiated_price && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">السعر المتفاوض عليه:</span>
                            <span className="font-medium text-green-600">
                              {request.negotiated_price} ريال
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {request.message && (
                        <p className="text-sm bg-muted p-3 rounded-lg mb-3">
                          "{request.message}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          }).format(new Date(request.created_at))}
                        </span>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              رفض
                            </Button>
                            <Button size="sm">
                              قبول
                            </Button>
                          </div>
                        )}
                        
                        {request.status === 'accepted' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1">
                              <Phone className="h-3 w-3" />
                              اتصال
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1">
                              <MessageSquare className="h-3 w-3" />
                              رسالة
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات خدمة حالياً
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Bookings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  حجوزات الخدمات
                </CardTitle>
                <Button variant="outline" size="sm">
                  عرض الكل
                </Button>
              </div>
              <CardDescription>
                الحجوزات المباشرة للخدمات من العملاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : serviceBookings.length > 0 ? (
                <div className="space-y-4">
                  {serviceBookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            {booking.services?.name_ar || booking.services?.name || 'خدمة غير محددة'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {booking.profiles?.full_name || 'عميل غير محدد'}
                          </p>
                        </div>
                        <Badge variant={
                          booking.status === 'completed' ? 'default' : 
                          booking.status === 'confirmed' ? 'secondary' : 
                          booking.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {booking.status === 'completed' ? 'مكتمل' : 
                           booking.status === 'confirmed' ? 'مؤكد' : 
                           booking.status === 'cancelled' ? 'ملغي' : 'معلق'}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">قيمة الحجز:</span>
                          <span className="font-medium text-green-600">
                            {booking.total_amount} ريال
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">موعد الخدمة:</span>
                          <span className="font-medium">
                            {new Date(booking.service_date).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      
                      {booking.special_requests && (
                        <p className="text-sm bg-muted p-3 rounded-lg mb-3">
                          طلبات خاصة: "{booking.special_requests}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(booking.created_at).toLocaleDateString('ar-SA')}
                        </span>
                        
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleBookingStatus(booking.id, 'cancelled')}
                            >
                              رفض
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleBookingStatus(booking.id, 'confirmed')}
                            >
                              تأكيد
                            </Button>
                          </div>
                        )}
                        
                        {booking.status === 'confirmed' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleBookingStatus(booking.id, 'completed')}
                            >
                              إكمال الخدمة
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Phone className="h-3 w-3" />
                              اتصال
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حجوزات حالياً
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>
                الأنشطة الأكثر استخداماً في حسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button asChild variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Link to="/create-service">
                    <Plus className="h-6 w-6" />
                    <span>إضافة خدمة</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <MessageSquare className="h-6 w-6" />
                  <span>الرسائل</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Wallet className="h-6 w-6" />
                  <span>المحفظة</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <span>التقارير</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;