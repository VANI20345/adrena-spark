import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  QrCode, 
  Calendar, 
  MapPin, 
  Download,
  Share2,
  Camera,
  CheckCircle,
  Star,
  Loader2,
  Ticket
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TicketData {
  id: string;
  booking_reference: string;
  status: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  events: {
    id: string;
    title: string;
    title_ar: string;
    start_date: string;
    end_date: string;
    location: string;
    location_ar: string;
    image_url: string | null;
  } | null;
}

const Tickets = () => {
  const [scanResult, setScanResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { t, language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { user } = useAuth();

  // Fetch user's bookings as tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['user-event-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          status,
          quantity,
          total_amount,
          created_at,
          events:event_id (
            id,
            title,
            title_ar,
            start_date,
            end_date,
            location,
            location_ar,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TicketData[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const handleScanQR = () => {
    setIsScanning(true);
    // Simulate QR scanning
    setTimeout(() => {
      setScanResult('TK001234');
      setIsScanning(false);
    }, 2000);
  };

  const getStatusBadge = (status: string, eventDate?: string) => {
    const now = new Date();
    const eventDateTime = eventDate ? new Date(eventDate) : null;
    const isEventPast = eventDateTime && eventDateTime < now;
    
    if (isEventPast) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        {isRTL ? 'تم الحضور' : 'Attended'}
      </Badge>;
    }
    
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {isRTL ? 'نشط' : 'Active'}
        </Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          {isRTL ? 'قيد الانتظار' : 'Pending'}
        </Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{isRTL ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{isRTL ? 'غير معروف' : 'Unknown'}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP', { locale: isRTL ? ar : undefined });
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'p', { locale: isRTL ? ar : undefined });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{isRTL ? 'تذاكري' : 'My Tickets'}</h1>

          <Tabs defaultValue="my-tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-tickets">{isRTL ? 'تذاكري' : 'My Tickets'}</TabsTrigger>
              <TabsTrigger value="scan-qr">{isRTL ? 'مسح QR' : 'Scan QR'}</TabsTrigger>
            </TabsList>

            {/* My Tickets Tab */}
            <TabsContent value="my-tickets" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>{isRTL ? 'جاري التحميل...' : 'Loading tickets...'}</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isRTL ? 'لا توجد تذاكر' : 'No tickets yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isRTL ? 'احجز فعالية للحصول على تذكرتك' : 'Book an event to get your ticket'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="grid md:grid-cols-3 gap-0">
                          {/* Ticket Info */}
                          <div className="md:col-span-2 p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-2">
                                  {isRTL ? ticket.events?.title_ar : ticket.events?.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                                  {ticket.events?.start_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {formatDate(ticket.events.start_date)} • {formatTime(ticket.events.start_date)}
                                    </div>
                                  )}
                                  {ticket.events?.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      {isRTL ? ticket.events?.location_ar : ticket.events?.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {getStatusBadge(ticket.status, ticket.events?.start_date)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">{isRTL ? 'رقم الحجز' : 'Booking Ref'}</p>
                                <p className="font-mono font-semibold">{ticket.booking_reference}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{isRTL ? 'عدد التذاكر' : 'Quantity'}</p>
                                <p className="font-semibold">{ticket.quantity}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
                                <p className="font-semibold">{ticket.total_amount} SAR</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{isRTL ? 'تاريخ الحجز' : 'Booked On'}</p>
                                <p className="font-semibold">{formatDate(ticket.created_at)}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                {isRTL ? 'تحميل' : 'Download'}
                              </Button>
                              <Button size="sm" variant="outline">
                                <Share2 className="w-4 h-4 mr-2" />
                                {isRTL ? 'مشاركة' : 'Share'}
                              </Button>
                            </div>
                          </div>

                          {/* QR Code */}
                          <div className="border-t md:border-t-0 md:border-l border-dashed bg-muted/30 p-6 flex flex-col items-center justify-center">
                            <div className="w-32 h-32 bg-white rounded-lg p-2 mb-4 border flex items-center justify-center">
                              <QRCodeSVG 
                                value={ticket.booking_reference} 
                                size={112}
                                level="M"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                              {isRTL ? 'أظهر هذا الكود عند الدخول' : 'Show this code at entry'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* QR Scanner Tab */}
            <TabsContent value="scan-qr" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{isRTL ? 'مسح كود QR' : 'Scan QR Code'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Camera Scanner */}
                  <div className="text-center">
                    <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                      {isScanning ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="text-sm">{isRTL ? 'جاري المسح...' : 'Scanning...'}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-16 h-16 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? 'اضغط للمسح' : 'Click to scan'}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleScanQR} disabled={isScanning}>
                      <Camera className="w-4 h-4 mr-2" />
                      {isScanning 
                        ? (isRTL ? 'جاري المسح...' : 'Scanning...') 
                        : (isRTL ? 'بدء المسح' : 'Start Scan')}
                    </Button>
                  </div>

                  {/* Manual Entry */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">{isRTL ? 'إدخال يدوي' : 'Manual Entry'}</h3>
                    <div className="flex gap-2">
                      <Input 
                        placeholder={isRTL ? 'أدخل رقم التذكرة' : 'Enter ticket number'}
                        value={scanResult}
                        onChange={(e) => setScanResult(e.target.value)}
                      />
                      <Button onClick={() => scanResult && console.log('Verify:', scanResult)}>
                        {isRTL ? 'تحقق' : 'Verify'}
                      </Button>
                    </div>
                  </div>

                  {/* Scan Result */}
                  {scanResult && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{isRTL ? 'نتيجة المسح' : 'Scan Result'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isRTL ? 'رقم التذكرة' : 'Ticket Number'}: {scanResult}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-600 font-semibold">
                              {isRTL ? 'تذكرة صالحة' : 'Valid Ticket'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scan Guidelines */}
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                        {isRTL ? 'إرشادات المسح' : 'Scan Guidelines'}
                      </h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                        <li>• {isRTL ? 'تأكد من وضوح كود QR' : 'Ensure QR code is clear'}</li>
                        <li>• {isRTL ? 'ضع الكود داخل الإطار' : 'Position code within frame'}</li>
                        <li>• {isRTL ? 'استخدم إضاءة جيدة' : 'Use good lighting'}</li>
                        <li>• {isRTL ? 'ثبت الكاميرا أثناء المسح' : 'Hold camera steady'}</li>
                      </ul>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Tickets;
