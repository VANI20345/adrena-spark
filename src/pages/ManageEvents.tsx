import React, { useState } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, Eye, Edit, Trash2, Plus, Search, QrCode, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ManageEventsPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const activeEvents = [
    {
      id: 1,
      title: 'رحلة جبلية إلى أبها',
      date: '2024-02-15',
      location: 'أبها',
      attendees: 25,
      maxAttendees: 30,
      price: 150,
      status: 'active',
      revenue: 3750,
      image: '/placeholder.svg'
    },
    {
      id: 2,
      title: 'ورشة طبخ تقليدي',
      date: '2024-02-20',
      location: 'الرياض',
      attendees: 12,
      maxAttendees: 15,
      price: 75,
      status: 'active',
      revenue: 900,
      image: '/placeholder.svg'
    }
  ];

  const completedEvents = [
    {
      id: 3,
      title: 'مباراة كرة قدم ودية',
      date: '2024-01-10',
      location: 'جدة',
      attendees: 22,
      maxAttendees: 22,
      price: 50,
      status: 'completed',
      revenue: 1100,
      rating: 4.5,
      image: '/placeholder.svg'
    }
  ];

  const draftEvents = [
    {
      id: 4,
      title: 'نشاط تصوير طبيعة',
      date: '2024-03-01',
      location: 'الطائف',
      attendees: 0,
      maxAttendees: 20,
      price: 100,
      status: 'draft',
      revenue: 0,
      image: '/placeholder.svg'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">نشط</Badge>;
      case 'completed':
        return <Badge variant="secondary">مكتمل</Badge>;
      case 'draft':
        return <Badge variant="outline">مسودة</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const EventCard = ({ event }: { event: any }) => (
    <Card className="overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/4">
          <img 
            src={event.image} 
            alt={event.title} 
            className="w-full h-48 md:h-full object-cover"
          />
        </div>
        <div className="md:w-3/4 p-6">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(event.status)}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-primary">{event.attendees}</div>
                <div className="text-xs text-muted-foreground">مشارك</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{event.maxAttendees}</div>
                <div className="text-xs text-muted-foreground">الحد الأقصى</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-green-600">{event.revenue}</div>
                <div className="text-xs text-muted-foreground">الإيرادات</div>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{event.price}</div>
                <div className="text-xs text-muted-foreground">السعر</div>
              </div>
            </div>

            {event.rating && (
              <div className="mb-4 text-sm">
                <Badge variant="outline">تقييم: {event.rating}/5 ⭐</Badge>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                عرض
              </Button>
              {event.status !== 'completed' && (
                <>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    المشاركين
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    مجموعة الحدث
                  </Button>
                </>
              )}
              {event.status === 'active' && (
                <Button size="sm" variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );

  const getEventsForTab = (tab: string) => {
    switch (tab) {
      case 'active':
        return activeEvents;
      case 'completed':
        return completedEvents;
      case 'draft':
        return draftEvents;
      default:
        return [];
    }
  };

  const filteredEvents = getEventsForTab(activeTab).filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">إدارة الفعاليات</h1>
              <p className="text-muted-foreground">
                إدارة وتتبع جميع فعالياتك
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/create-event">
                <Plus className="h-4 w-4" />
                إنشاء فعالية جديدة
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الفعاليات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الفعاليات</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">+1 هذا الشهر</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الفعاليات النشطة</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">37 مشارك مجموع</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <div className="text-green-600">ريال</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5,750</div>
                <p className="text-xs text-muted-foreground">+4,650 هذا الشهر</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
                <div className="text-yellow-500">⭐</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.5</div>
                <p className="text-xs text-muted-foreground">من 5 نجوم</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">النشطة ({activeEvents.length})</TabsTrigger>
              <TabsTrigger value="completed">المكتملة ({completedEvents.length})</TabsTrigger>
              <TabsTrigger value="draft">المسودات ({draftEvents.length})</TabsTrigger>
              <TabsTrigger value="cancelled">الملغية (0)</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'لا توجد نتائج' : `لا توجد فعاليات ${activeTab === 'active' ? 'نشطة' : activeTab === 'completed' ? 'مكتملة' : 'مسودات'}`}
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchTerm ? 'جرب البحث بكلمات أخرى' : 'ابدأ بإنشاء أول فعالية لك'}
                    </p>
                    {!searchTerm && (
                      <Button asChild>
                        <Link to="/create-event">إنشاء فعالية جديدة</Link>
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

export default ManageEventsPage;