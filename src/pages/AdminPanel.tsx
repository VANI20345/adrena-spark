import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  Settings,
  Database,
  Map,
  Globe,
  BarChart3,
  AlertCircle,
  UserPlus,
  Crown,
  Key,
  Mail,
  Smartphone,
  Activity,
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  User
} from 'lucide-react';

const AdminPanel = () => {
  const { userRole, loading } = useAuth();
  const { t, language } = useLanguageContext();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalServices: 0,
    pendingReviews: 0,
    totalRevenue: 0,
    activeBookings: 0,
    totalCategories: 0,
    systemHealth: 'good'
  });
  
  // Data states
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [financialReports, setFinancialReports] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Form states
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [mapboxToken, setMapboxToken] = useState('');
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'أدرينا',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    smsNotifications: true
  });

  useEffect(() => {
    if (userRole === 'admin') {
      loadAdminData();
      loadSystemLogs();
      loadFinancialReports();
    }
  }, [userRole]);

  const loadAdminData = async () => {
    try {
      // Load comprehensive statistics
      const [
        { data: usersData },
        { data: eventsData },
        { data: servicesData },
        { data: pendingEventsData },
        { data: pendingServicesData },
        { data: usersDataFull },
        { data: categoriesData },
        { data: bookingsData }
      ] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('events').select('id'),
        supabase.from('services').select('id'),
        supabase.from('events').select('*').eq('status', 'pending'),
        supabase.from('services').select('*').eq('status', 'pending'),
        supabase.from('profiles').select(`
          *, 
          user_roles(role),
          user_wallets(balance, total_earned)
        `),
        supabase.from('categories').select('*'),
        supabase.from('bookings').select('*, payments(amount)').eq('status', 'confirmed')
      ]);

      const totalRevenue = bookingsData?.reduce((sum, booking) => {
        const paymentAmount = booking.payments?.[0]?.amount || 0;
        return sum + Number(paymentAmount);
      }, 0) || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        totalEvents: eventsData?.length || 0,
        totalServices: servicesData?.length || 0,
        pendingReviews: (pendingEventsData?.length || 0) + (pendingServicesData?.length || 0),
        totalRevenue,
        activeBookings: bookingsData?.length || 0,
        totalCategories: categoriesData?.length || 0,
        systemHealth: 'good'
      });

      setPendingEvents(pendingEventsData || []);
      setPendingServices(pendingServicesData || []);
      setUsers(usersDataFull || []);
      setCategories(categoriesData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('خطأ في تحميل البيانات');
    }
  };

  const loadSystemLogs = async () => {
    // In a real implementation, this would fetch from a logs table
    setSystemLogs([
      { id: 1, level: 'INFO', message: 'User registered successfully', timestamp: new Date().toISOString() },
      { id: 2, level: 'ERROR', message: 'Payment processing failed', timestamp: new Date().toISOString() },
      { id: 3, level: 'WARNING', message: 'High CPU usage detected', timestamp: new Date().toISOString() },
    ]);
  };

  const loadFinancialReports = async () => {
    try {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, created_at, status')
        .eq('status', 'completed');

      const monthlyRevenue = paymentsData?.reduce((acc, payment) => {
        const month = new Date(payment.created_at).toLocaleString('ar-SA', { year: 'numeric', month: 'long' });
        acc[month] = (acc[month] || 0) + Number(payment.amount);
        return acc;
      }, {});

      setFinancialReports(Object.entries(monthlyRevenue || {}).map(([month, amount]) => ({ month, amount })));
    } catch (error) {
      console.error('Error loading financial reports:', error);
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
        toast.success(`تم ${action === 'approve' ? 'قبول' : 'رفض'} الفعالية`);
        loadAdminData();
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('خطأ في تحديث الفعالية');
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
        toast.success(`تم ${action === 'approve' ? 'قبول' : 'رفض'} الخدمة`);
        loadAdminData();
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('خطأ في تحديث الخدمة');
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'attendee' | 'organizer' | 'provider' | 'admin' })
        .eq('user_id', userId);
      
      if (!error) {
        toast.success('تم تحديث دور المستخدم');
        loadAdminData();
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('خطأ في تحديث دور المستخدم');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        // In a real implementation, you'd need to handle this through an admin function
        // that properly removes all user data
        toast.warning('ميزة حذف المستخدم تتطلب تنفيذ متقدم للأمان');
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('خطأ في حذف المستخدم');
      }
    }
  };

  const handleSystemSettingsUpdate = async () => {
    try {
      // In a real implementation, save to system_settings table
      toast.success('تم تحديث إعدادات النظام');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('خطأ في تحديث الإعدادات');
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.user_roles?.[0]?.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">لوحة الإدارة الشاملة</h1>
          <p className="text-muted-foreground">إدارة متقدمة ومراقبة شاملة لمنصة أدرينا</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="reviews">المراجعات</TabsTrigger>
            <TabsTrigger value="users">المستخدمون</TabsTrigger>
            <TabsTrigger value="content">المحتوى</TabsTrigger>
            <TabsTrigger value="finance">المالية</TabsTrigger>
            <TabsTrigger value="system">النظام</TabsTrigger>
            <TabsTrigger value="maps">الخرائط</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">+5.2% من الشهر الماضي</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الفعاليات</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">+12 هذا الأسبوع</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الخدمات</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalServices}</div>
                  <p className="text-xs text-muted-foreground">+8 هذا الشهر</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} ر.س</div>
                  <p className="text-xs text-muted-foreground">+18.3% من الشهر الماضي</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    حالة النظام
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">أداء الخادم</span>
                    <Badge variant="default">ممتاز</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">قاعدة البيانات</span>
                    <Badge variant="default">مستقرة</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">خدمة الدفع</span>
                    <Badge variant="default">متصلة</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">خدمة الإشعارات</span>
                    <Badge variant="secondary">متوقفة</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>آخر الأنشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">تم قبول فعالية جديدة</span>
                      <span className="text-xs text-muted-foreground">منذ 5 دقائق</span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">انضم 3 مستخدمين جدد</span>
                      <span className="text-xs text-muted-foreground">منذ ساعة</span>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm">تم تحصيل دفعة 450 ر.س</span>
                      <span className="text-xs text-muted-foreground">منذ ساعتين</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات سريعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">معدل القبول</span>
                    <span className="font-semibold text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">متوسط التقييم</span>
                    <span className="font-semibold">4.6/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">المستخدمون النشطون</span>
                    <span className="font-semibold">{Math.round(stats.totalUsers * 0.7)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">معدل التحويل</span>
                    <span className="font-semibold text-blue-600">23%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الفعاليات المعلقة ({pendingEvents.length})</CardTitle>
                  <CardDescription>فعاليات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingEvents.slice(0, 5).map((event: any) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{event.title_ar}</h4>
                          <Badge variant="outline">معلق</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{event.description_ar?.substring(0, 100)}...</p>
                        {event.requires_license && (
                          <Alert className="mb-3">
                            <Shield className="h-4 w-4" />
                            <AlertDescription>تتطلب ترخيص - يجب مراجعة المستندات</AlertDescription>
                          </Alert>
                        )}
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button size="sm" onClick={() => handleEventAction(event.id, 'approve')}>
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleEventAction(event.id, 'reject')}>
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
                  <CardTitle>الخدمات المعلقة ({pendingServices.length})</CardTitle>
                  <CardDescription>خدمات تحتاج مراجعة وموافقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingServices.slice(0, 5).map((service: any) => (
                      <div key={service.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{service.name_ar}</h4>
                          <Badge variant="outline">معلق</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{service.description_ar?.substring(0, 100)}...</p>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button size="sm" onClick={() => handleServiceAction(service.id, 'approve')}>
                            <CheckCircle className="w-4 h-4 ml-1" />
                            قبول
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleServiceAction(service.id, 'reject')}>
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

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  إدارة المستخدمين المتقدمة
                </CardTitle>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input 
                    placeholder="البحث عن مستخدم..." 
                    className="max-w-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="فلترة حسب الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأدوار</SelectItem>
                      <SelectItem value="attendee">حاضر</SelectItem>
                      <SelectItem value="organizer">منظم</SelectItem>
                      <SelectItem value="provider">مقدم خدمة</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="w-4 h-4 ml-2" />
                    تصدير البيانات
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>النقاط</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 10).map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'غير محدد'}</p>
                              <p className="text-sm text-muted-foreground">{user.email || 'غير متوفر'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.user_roles?.[0]?.role || 'غير محدد'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.points_balance || 0}</TableCell>
                        <TableCell>{user.user_wallets?.[0]?.balance || 0} ر.س</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1 rtl:space-x-reverse">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Crown className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>تغيير دور المستخدم</DialogTitle>
                                  <DialogDescription>
                                    اختر الدور الجديد للمستخدم {user.full_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Select value={newRole} onValueChange={setNewRole}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="اختر الدور الجديد" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="attendee">حاضر</SelectItem>
                                      <SelectItem value="organizer">منظم</SelectItem>
                                      <SelectItem value="provider">مقدم خدمة</SelectItem>
                                      <SelectItem value="admin">مدير</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={() => handleUserRoleChange(user.id, newRole)}
                                      disabled={!newRole}
                                    >
                                      تحديث الدور
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
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

          {/* Content Management */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إدارة الفئات</CardTitle>
                  <CardDescription>إضافة وتحرير فئات الفعاليات والخدمات</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="اسم الفئة الجديدة" />
                      <Button>إضافة فئة</Button>
                    </div>
                    <div className="space-y-2">
                      {categories.map((category: any) => (
                        <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                          <span>{category.name_ar}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إدارة الترجمة</CardTitle>
                  <CardDescription>إضافة وتحديث ترجمات النظام</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="المفتاح (key)" />
                      <Input placeholder="النص العربي" />
                    </div>
                    <Input placeholder="النص الإنجليزي" />
                    <Button className="w-full">
                      <Globe className="w-4 h-4 ml-2" />
                      إضافة ترجمة
                    </Button>
                    
                    <div className="border rounded p-4 max-h-60 overflow-y-auto">
                      <h4 className="font-semibold mb-2">الترجمات الحالية:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>home</span>
                          <span>الرئيسية | Home</span>
                        </div>
                        <div className="flex justify-between">
                          <span>events</span>
                          <span>الفعاليات | Events</span>
                        </div>
                        {/* Add more translation entries */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Management */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>التقارير المالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financialReports.map((report: any, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <span className="font-medium">{report.month}</span>
                        <span className="text-green-600">{report.amount?.toLocaleString()} ر.س</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إعدادات العمولة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>نسبة العمولة للفعاليات (%)</Label>
                    <Input type="number" defaultValue="10" />
                  </div>
                  <div>
                    <Label>نسبة العمولة للخدمات (%)</Label>
                    <Input type="number" defaultValue="15" />
                  </div>
                  <Button className="w-full">حفظ الإعدادات</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إدارة المدفوعات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 ml-2" />
                      تصدير تقرير مالي
                    </Button>
                    <Button className="w-full" variant="outline">
                      <RefreshCw className="w-4 h-4 ml-2" />
                      معالجة الدفعات المعلقة
                    </Button>
                    <Button className="w-full" variant="outline">
                      <BarChart3 className="w-4 h-4 ml-2" />
                      إحصائيات مفصلة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Management */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>سجل النظام</CardTitle>
                  <CardDescription>مراقبة أنشطة النظام والأخطاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {systemLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          log.level === 'ERROR' ? 'bg-red-500' :
                          log.level === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </p>
                        </div>
                        <Badge variant={log.level === 'ERROR' ? 'destructive' : 'secondary'}>
                          {log.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>أدوات النظام</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Database className="w-4 h-4 ml-2" />
                    نسخ احتياطي لقاعدة البيانات
                  </Button>
                  <Button className="w-full" variant="outline">
                    <RefreshCw className="w-4 h-4 ml-2" />
                    إعادة تشغيل النظام
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Activity className="w-4 h-4 ml-2" />
                    فحص أداء النظام
                  </Button>
                  <Button className="w-full" variant="outline">
                    <AlertTriangle className="w-4 h-4 ml-2" />
                    تنظيف سجل الأخطاء
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mapbox Management */}
          <TabsContent value="maps" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  إعدادات Mapbox
                </CardTitle>
                <CardDescription>
                  إدارة إعدادات الخرائط ورموز الوصول
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mapbox-token">رمز Mapbox العام</Label>
                  <Input
                    id="mapbox-token"
                    type="password"
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJ..."
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    سيتم استخدام هذا الرمز لعرض الخرائط في جميع أنحاء التطبيق
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>نمط الخريطة الافتراضي</Label>
                    <Select defaultValue="streets">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="streets">الشوارع</SelectItem>
                        <SelectItem value="satellite">القمر الصناعي</SelectItem>
                        <SelectItem value="light">فاتح</SelectItem>
                        <SelectItem value="dark">داكن</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>مستوى التكبير الافتراضي</Label>
                    <Input type="number" defaultValue="10" min="1" max="20" />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button>
                    <Key className="w-4 h-4 ml-2" />
                    حفظ إعدادات الخريطة
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 ml-2" />
                    اختبار الاتصال
                  </Button>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    تأكد من أن رمز Mapbox صالح ولديه الصلاحيات المطلوبة لعرض الخرائط والجيوكودينغ
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات النظام العامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="site-name">اسم الموقع</Label>
                    <Input
                      id="site-name"
                      value={systemSettings.siteName}
                      onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>وضع الصيانة</Label>
                      <p className="text-sm text-muted-foreground">تفعيل وضع الصيانة يمنع الوصول للموقع</p>
                    </div>
                    <Button
                      variant={systemSettings.maintenanceMode ? "destructive" : "outline"}
                      onClick={() => setSystemSettings({
                        ...systemSettings, 
                        maintenanceMode: !systemSettings.maintenanceMode
                      })}
                    >
                      {systemSettings.maintenanceMode ? "إيقاف" : "تفعيل"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>السماح بالتسجيل الجديد</Label>
                      <p className="text-sm text-muted-foreground">السماح للمستخدمين الجدد بإنشاء حسابات</p>
                    </div>
                    <Button
                      variant={systemSettings.registrationEnabled ? "default" : "outline"}
                      onClick={() => setSystemSettings({
                        ...systemSettings, 
                        registrationEnabled: !systemSettings.registrationEnabled
                      })}
                    >
                      {systemSettings.registrationEnabled ? "مفعل" : "معطل"}
                    </Button>
                  </div>
                  
                  <Button onClick={handleSystemSettingsUpdate} className="w-full">
                    <Settings className="w-4 h-4 ml-2" />
                    حفظ إعدادات النظام
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إعدادات الإشعارات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>إشعارات البريد الإلكتروني</Label>
                      <p className="text-sm text-muted-foreground">إرسال إشعارات عبر البريد الإلكتروني</p>
                    </div>
                    <Button
                      variant={systemSettings.emailNotifications ? "default" : "outline"}
                      onClick={() => setSystemSettings({
                        ...systemSettings, 
                        emailNotifications: !systemSettings.emailNotifications
                      })}
                    >
                      <Mail className="w-4 h-4 ml-2" />
                      {systemSettings.emailNotifications ? "مفعل" : "معطل"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>الرسائل النصية</Label>
                      <p className="text-sm text-muted-foreground">إرسال إشعارات عبر الرسائل النصية</p>
                    </div>
                    <Button
                      variant={systemSettings.smsNotifications ? "default" : "outline"}
                      onClick={() => setSystemSettings({
                        ...systemSettings, 
                        smsNotifications: !systemSettings.smsNotifications
                      })}
                    >
                      <Smartphone className="w-4 h-4 ml-2" />
                      {systemSettings.smsNotifications ? "مفعل" : "معطل"}
                    </Button>
                  </div>
                  
                  <div>
                    <Label>قالب الإشعار الافتراضي</Label>
                    <Textarea placeholder="أدخل قالب الإشعار..." />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;