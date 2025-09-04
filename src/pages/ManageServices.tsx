import React, { useState } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MapPin, Eye, Edit, Trash2, Plus, Search, Star, MessageCircle, Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManageServicesPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const activeServices = [
    {
      id: 1,
      name: 'تأجير معدات التصوير',
      description: 'كاميرات احترافية ومعدات تصوير متنوعة',
      location: 'الرياض',
      price: 200,
      duration: 120,
      status: 'active',
      rating: 4.8,
      bookings: 15,
      revenue: 3000,
      image: '/placeholder.svg',
      category: 'معدات'
    },
    {
      id: 2,
      name: 'خدمة الطعام والمشروبات',
      description: 'وجبات طعام تقليدية ومشروبات متنوعة',
      location: 'جدة',
      price: 50,
      duration: 60,
      status: 'active',
      rating: 4.5,
      bookings: 23,
      revenue: 1150,
      image: '/placeholder.svg',
      category: 'طعام'
    }
  ];

  const pendingServices = [
    {
      id: 3,
      name: 'تنظيم رحلات سياحية',
      description: 'تنظيم رحلات سياحية داخلية وخارجية',
      location: 'الدمام',
      price: 500,
      duration: 480,
      status: 'pending',
      rating: 0,
      bookings: 0,
      revenue: 0,
      image: '/placeholder.svg',
      category: 'سياحة'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
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

  const ServiceCard = ({ service }: { service: any }) => (
    <Card className="overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/4">
          <img 
            src={service.image} 
            alt={service.name} 
            className="w-full h-48 md:h-full object-cover"
          />
        </div>
        <div className="md:w-3/4 p-6">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-2">{service.name}</CardTitle>
                <CardDescription className="mb-2">{service.description}</CardDescription>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{service.location}</span>
                  </div>
                  <Badge variant="outline">{service.category}</Badge>
                </div>
              </div>
              {getStatusBadge(service.status)}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-primary">{service.bookings}</div>
                <div className="text-xs text-muted-foreground">حجز</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-green-600">{service.revenue}</div>
                <div className="text-xs text-muted-foreground">الإيرادات</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{service.price}</div>
                <div className="text-xs text-muted-foreground">السعر</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{service.duration}</div>
                <div className="text-xs text-muted-foreground">دقيقة</div>
              </div>
            </div>

            {service.rating > 0 && (
              <div className="mb-4 text-sm">
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {service.rating}/5
                </Badge>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                عرض
              </Button>
              {service.status !== 'rejected' && (
                <>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    تعديل
                  </Button>
                  {service.status === 'active' && (
                    <>
                      <Button size="sm" variant="outline" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        الرسائل ({service.bookings})
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-2">
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

  const getServicesForTab = (tab: string) => {
    switch (tab) {
      case 'active':
        return activeServices;
      case 'pending':
        return pendingServices;
      case 'draft':
        return [];
      default:
        return [];
    }
  };

  const filteredServices = getServicesForTab(activeTab).filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">+1 هذا الشهر</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">38</div>
                <p className="text-xs text-muted-foreground">+12 هذا الشهر</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4,150</div>
                <p className="text-xs text-muted-foreground">ريال هذا الشهر</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.7</div>
                <p className="text-xs text-muted-foreground">من 5 نجوم</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">النشطة ({activeServices.length})</TabsTrigger>
              <TabsTrigger value="pending">قيد المراجعة ({pendingServices.length})</TabsTrigger>
              <TabsTrigger value="draft">المسودات (0)</TabsTrigger>
              <TabsTrigger value="rejected">المرفوضة (0)</TabsTrigger>
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
                      {searchTerm ? 'لا توجد نتائج' : `لا توجد خدمات ${activeTab === 'active' ? 'نشطة' : activeTab === 'pending' ? 'قيد المراجعة' : 'مسودات'}`}
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