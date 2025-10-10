import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Settings,
  BarChart3,
  User,
  Shield,
  UserCheck,
  UserX
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type UserRole = 'attendee' | 'organizer' | 'provider' | 'admin';

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalServices: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user && userRole) {
      loadDashboardData();
    }
  }, [user, userRole]);

  const loadDashboardData = async () => {
    try {
      if (userRole === 'organizer') {
        // Load organizer's events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('organizer_id', user!.id);
        
        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
        setStats(prev => ({ ...prev, totalEvents: eventsData?.length || 0 }));
      }
      
      if (userRole === 'provider') {
        // Load service provider's services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('provider_id', user!.id);
        
        if (servicesError) throw servicesError;
        setServices(servicesData || []);
        setStats(prev => ({ ...prev, totalServices: servicesData?.length || 0 }));
      }
      
      if (userRole === 'admin') {
        // Load admin stats
        const [eventsRes, servicesRes, usersRes] = await Promise.all([
          supabase.from('events').select('count'),
          supabase.from('services').select('count'),
          supabase.from('profiles').select('count')
        ]);
        
        setStats({
          totalEvents: eventsRes.count || 0,
          totalServices: servicesRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalRevenue: 0
        });

        // Load all users for admin
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            *,
            user_roles(role)
          `);
        
        if (usersError) throw usersError;
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      toast({
        title: "تم التغيير بنجاح",
        description: "تم تغيير دور المستخدم بنجاح"
      });
      
      loadDashboardData();
    } catch (error) {
      console.error('Error changing user role:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير دور المستخدم",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'organizer': return 'bg-blue-100 text-blue-800';
      case 'service_provider': return 'bg-green-100 text-green-800';
      case 'attendee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'أدمن';
      case 'organizer': return 'منظم';
      case 'service_provider': return 'مقدم خدمة';
      case 'attendee': return 'مشارك';
      default: return role;
    }
  };

  if (!user || !userRole) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            لوحة التحكم
          </h1>
          <p className="text-lg text-muted-foreground">
            مرحباً بك في لوحة التحكم الخاصة بك
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {userRole === 'organizer' && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    إجمالي الفعاليات
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    المشاركون
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {events.reduce((sum, event: any) => sum + (event.current_attendees || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {userRole === 'provider' && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    إجمالي الخدمات
                  </CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalServices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    الطلبات
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {services.length}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {userRole === 'admin' && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    إجمالي الفعاليات
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    إجمالي الخدمات
                  </CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalServices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    المستخدمون
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    الإيرادات
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue} ريال</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            {userRole === 'organizer' && (
              <TabsTrigger value="events">فعالياتي</TabsTrigger>
            )}
          {userRole === 'provider' && (
              <TabsTrigger value="services">خدماتي</TabsTrigger>
            )}
            {userRole === 'admin' && (
              <>
                <TabsTrigger value="events">الفعاليات</TabsTrigger>
                <TabsTrigger value="services">الخدمات</TabsTrigger>
                <TabsTrigger value="users">المستخدمون</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الأنشطة الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">تم إنشاء فعالية جديدة</p>
                        <p className="text-xs text-muted-foreground">منذ ساعتين</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">تم قبول طلب جديد</p>
                        <p className="text-xs text-muted-foreground">منذ 4 ساعات</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الإحصائيات السريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">معدل القبول</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">متوسط التقييم</span>
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">الطلبات المعلقة</span>
                      <span className="text-sm font-medium">3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {userRole === 'organizer' && (
            <TabsContent value="events" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">فعالياتي</h2>
                <Button asChild>
                  <Link to="/create-event">
                    <Plus className="w-4 h-4 ml-2" />
                    إنشاء فعالية جديدة
                  </Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event: any) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{event.title_ar}</CardTitle>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status === 'pending' ? 'معلق' : 
                           event.status === 'approved' ? 'مقبول' : 'مرفوض'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {event.description_ar?.substring(0, 100)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-primary">
                          {event.price} ريال
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {userRole === 'provider' && (
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
                {services.map((service: any) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{service.name_ar}</CardTitle>
                        <Badge className={getStatusColor(service.status)}>
                          {service.status === 'pending' ? 'معلق' : 
                           service.status === 'approved' ? 'مقبول' : 'مرفوض'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {service.description_ar?.substring(0, 100)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-primary">
                          {service.price} ريال
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {userRole === 'admin' && (
            <>
              <TabsContent value="users" className="space-y-6">
                <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>
                
                <div className="space-y-4">
                  {users.map((user: any) => (
                    <Card key={user.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{user.full_name || 'بدون اسم'}</h3>
                              <p className="text-sm text-muted-foreground">{user.bio || 'بدون وصف'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <Badge className={getRoleColor(user.user_roles?.[0]?.role || 'attendee')}>
                              {getRoleLabel(user.user_roles?.[0]?.role || 'attendee')}
                            </Badge>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeUserRole(user.user_id, 'admin')}
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeUserRole(user.user_id, 'organizer')}
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeUserRole(user.user_id, 'provider')}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => changeUserRole(user.user_id, 'attendee')}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="events" className="space-y-6">
                <h2 className="text-2xl font-bold">إدارة الفعاليات</h2>
                <p className="text-muted-foreground">قريباً - إدارة وموافقة الفعاليات</p>
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <h2 className="text-2xl font-bold">إدارة الخدمات</h2>
                <p className="text-muted-foreground">قريباً - إدارة وموافقة الخدمات</p>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;