import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Shield,
  Settings
} from 'lucide-react';

const AdminPanel = () => {
  const { userRole, loading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    pendingReviews: 0,
    totalRevenue: 0
  });
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (userRole === 'admin') {
      loadAdminData();
    }
  }, [userRole]);

  const loadAdminData = async () => {
    try {
      // Load statistics
      const { data: usersData } = await supabase.from('profiles').select('id');
      const { data: eventsData } = await supabase.from('events').select('id');
      const { data: pendingEventsData } = await supabase.from('events').select('*').eq('status', 'pending');
      const { data: pendingServicesData } = await supabase.from('services').select('*').eq('status', 'pending');
      const { data: usersDataFull } = await supabase.from('profiles').select('*');

      setStats({
        totalUsers: usersData?.length || 0,
        totalEvents: eventsData?.length || 0,
        pendingReviews: (pendingEventsData?.length || 0) + (pendingServicesData?.length || 0),
        totalRevenue: 0 // This would come from payments calculation
      });

      setPendingEvents(pendingEventsData || []);
      setPendingServices(pendingServicesData || []);
      setUsers(usersDataFull || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleEventAction = async (eventId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'active' : 'rejected';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId);
      
      if (!error) {
        loadAdminData();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleServiceAction = async (serviceId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'active' : 'rejected';
    
    try {
      const { error } = await supabase
        .from('services')
        .update({ status })
        .eq('id', serviceId);
      
      if (!error) {
        loadAdminData();
      }
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة الإدارة</h1>
          <p className="text-muted-foreground">إدارة شاملة لمنصة أدرينا</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="reviews">المراجعات</TabsTrigger>
            <TabsTrigger value="users">المستخدمون</TabsTrigger>
            <TabsTrigger value="groups">القروبات</TabsTrigger>
            <TabsTrigger value="finance">المالية</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الفعاليات</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المراجعات المعلقة</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingReviews}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue} ر.س</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>آخر الأنشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">تم قبول فعالية جديدة</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">انضم مستخدم جديد</span>
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
                      <span>معدل القبول</span>
                      <span className="font-semibold">85%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط التقييم</span>
                      <span className="font-semibold">4.2/5</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الفعاليات المعلقة</CardTitle>
                  <CardDescription>فعاليات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingEvents.map((event: any) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{event.title_ar}</h4>
                          <Badge variant="outline">معلق</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{event.description_ar}</p>
                        {event.requires_license && (
                          <Alert className="mb-3">
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                              تتطلب ترخيص - يجب مراجعة المستندات
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleEventAction(event.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleEventAction(event.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 ml-1" />
                            عرض
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الخدمات المعلقة</CardTitle>
                  <CardDescription>خدمات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingServices.map((service: any) => (
                      <div key={service.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{service.name_ar}</h4>
                          <Badge variant="outline">معلق</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{service.description_ar}</p>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleServiceAction(service.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleServiceAction(service.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 ml-1" />
                            عرض
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
                <div className="flex space-x-2">
                  <Input placeholder="البحث عن مستخدم..." className="max-w-xs" />
                  <Select>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="فلترة حسب الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأدوار</SelectItem>
                      <SelectItem value="attendee">باحث/مشارك</SelectItem>
                      <SelectItem value="organizer">منظم</SelectItem>
                      <SelectItem value="provider">مقدم خدمة</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 10).map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || 'غير محدد'}</TableCell>
                        <TableCell>{user.email || 'غير متوفر'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">مستخدم</Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة القروبات</CardTitle>
                <CardDescription>قروبات المناطق وقروبات الفعاليات</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    سيتم تطوير نظام إدارة القروبات قريباً
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>التقارير المالية والتسويات</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    نظام التقارير المالية قيد التطوير
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الإعدادات الإدارية</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    إعدادات النظام والولاء والكوبونات قيد التطوير
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;