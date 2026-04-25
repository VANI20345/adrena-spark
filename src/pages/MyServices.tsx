import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Clock, Download, Star, MessageCircle, ChevronRight, Package, GraduationCap, Percent, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const MyServicesPage = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyServices = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('service_bookings')
          .select(`
            *,
            services!service_id (
              id,
              name,
              name_ar,
              description,
              description_ar,
              image_url,
              service_type,
              price,
              duration_minutes,
              provider_id,
              profiles!provider_id (full_name, avatar_url)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyServices();
  }, [user]);

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return <GraduationCap className="h-4 w-4" />;
      case 'discount': return <Percent className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'training': return isRTL ? 'تدريب' : 'Training';
      case 'discount': return isRTL ? 'خصم' : 'Discount';
      default: return isRTL ? 'خدمة أخرى' : 'Other Service';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-600">{isRTL ? 'مؤكد' : 'Confirmed'}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{isRTL ? 'مكتمل' : 'Completed'}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{isRTL ? 'ملغي' : 'Cancelled'}</Badge>;
      case 'pending':
        return <Badge variant="outline">{isRTL ? 'قيد الانتظار' : 'Pending'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'all') return true;
    if (activeTab === 'training') return booking.services?.service_type === 'training';
    if (activeTab === 'discount') return booking.services?.service_type === 'discount';
    if (activeTab === 'other') return !['training', 'discount'].includes(booking.services?.service_type);
    return true;
  });

  const upcomingBookings = filteredBookings.filter(b => 
    new Date(b.service_date) > new Date() && b.status === 'confirmed'
  );
  
  const completedBookings = filteredBookings.filter(b => 
    new Date(b.service_date) <= new Date() || b.status === 'completed'
  );

  const ServiceCard = ({ booking }: { booking: any }) => {
    const service = booking.services;
    if (!service) return null;

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" 
            onClick={() => navigate(`/services/${service.id}`)}>
        <div className="md:flex" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="md:w-1/3 relative">
            <img 
              src={service.image_url || '/placeholder.svg'} 
              alt={isRTL ? service.name_ar : service.name} 
              className="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              {getServiceTypeIcon(service.service_type)}
              {getServiceTypeLabel(service.service_type)}
            </div>
          </div>
          
          <div className="md:w-2/3 p-6">
            <CardHeader className="p-0 mb-4">
              <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">
                    {isRTL ? (service.name_ar || service.name) : (service.name || service.name_ar)}
                  </CardTitle>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {isRTL ? (service.description_ar || service.description) : (service.description || service.description_ar)}
                    </p>
                  )}
                </div>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            
            <CardContent className="p-0 space-y-3">
              {booking.booking_reference && (
                <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-mono bg-muted px-2 py-0.5 rounded">{booking.booking_reference}</span>
                </div>
              )}

              <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>
                  {format(new Date(booking.service_date), 'PPP', { locale: dateLocale })}
                  {booking.start_time && ` • ${booking.start_time}`}
                </span>
              </div>
              
              {service.duration_minutes && (
                <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{service.duration_minutes} {isRTL ? 'دقيقة' : 'minutes'}</span>
                </div>
              )}

              {service.profiles && (
                <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img 
                    src={service.profiles.avatar_url || '/placeholder.svg'} 
                    alt={service.profiles.full_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-muted-foreground">{service.profiles.full_name}</span>
                </div>
              )}
              
              <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold text-primary">
                  {booking.total_amount} {isRTL ? 'ر.س' : 'SAR'}
                </span>
                {booking.quantity > 1 && (
                  <span className="text-muted-foreground text-xs">
                    ({booking.quantity} {isRTL ? 'جلسات' : 'sessions'})
                  </span>
                )}
              </div>

              <div className={`flex flex-wrap gap-2 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={(e) => e.stopPropagation()}>
                {booking.status === 'confirmed' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      {isRTL ? 'تفاصيل الحجز' : 'Booking Details'}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {isRTL ? 'تواصل' : 'Contact'}
                    </Button>
                  </>
                )}
                {booking.status === 'completed' && (
                  <Button size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    {isRTL ? 'قيّم الخدمة' : 'Rate Service'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1 ms-auto">
                  {isRTL ? 'تفاصيل' : 'Details'}
                  <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-6">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold mb-2">{isRTL ? 'خدماتي المحجوزة' : 'My Booked Services'}</h1>
            <p className="text-muted-foreground">
              {isRTL ? 'إدارة الخدمات التي حجزتها' : 'Manage services you have booked'}
            </p>
          </div>

          {/* Filter by service type */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={activeTab === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('all')}
            >
              <Package className="h-4 w-4 me-2" />
              {isRTL ? 'الكل' : 'All'} ({bookings.length})
            </Button>
            <Button 
              variant={activeTab === 'training' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('training')}
            >
              <GraduationCap className="h-4 w-4 me-2" />
              {isRTL ? 'تدريب' : 'Training'} ({bookings.filter(b => b.services?.service_type === 'training').length})
            </Button>
            <Button 
              variant={activeTab === 'discount' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('discount')}
            >
              <Percent className="h-4 w-4 me-2" />
              {isRTL ? 'خصومات' : 'Discounts'} ({bookings.filter(b => b.services?.service_type === 'discount').length})
            </Button>
            <Button 
              variant={activeTab === 'other' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('other')}
            >
              <Briefcase className="h-4 w-4 me-2" />
              {isRTL ? 'أخرى' : 'Other'} ({bookings.filter(b => !['training', 'discount'].includes(b.services?.service_type)).length})
            </Button>
          </div>

          {/* Bookings List */}
          {filteredBookings.length > 0 ? (
            <div className="space-y-6">
              {/* Upcoming */}
              {upcomingBookings.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {isRTL ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
                  </h2>
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <ServiceCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed/Past */}
              {completedBookings.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    {isRTL ? 'الحجوزات السابقة' : 'Past Bookings'}
                  </h2>
                  <div className="space-y-4">
                    {completedBookings.map((booking) => (
                      <ServiceCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {isRTL ? 'لا توجد حجوزات' : 'No bookings yet'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {isRTL ? 'لم تحجز أي خدمات بعد' : "You haven't booked any services yet"}
                </p>
                <Button onClick={() => navigate('/services')}>
                  {isRTL ? 'تصفح الخدمات' : 'Browse Services'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyServicesPage;
