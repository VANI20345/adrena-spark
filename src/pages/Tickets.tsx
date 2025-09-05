import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  QrCode, 
  Calendar, 
  MapPin, 
  Users, 
  Download,
  Share2,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Star
} from 'lucide-react';

const Tickets = () => {
  const [scanResult, setScanResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Mock tickets data
  const tickets = [
    {
      id: '1',
      eventTitle: 'هايكنج جبل طويق المتقدم',
      eventDate: '2024-03-15',
      eventTime: '06:00',
      eventLocation: 'الرياض',
      ticketNumber: 'TK001234',
      holderName: 'أحمد محمد',
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
      status: 'active',
      checkedIn: false,
      bookingReference: 'BK789456'
    },
    {
      id: '2',
      eventTitle: 'غوص في أعماق البحر الأحمر',
      eventDate: '2024-02-20',
      eventTime: '08:00',
      eventLocation: 'جدة',
      ticketNumber: 'TK001235',
      holderName: 'أحمد محمد',
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
      status: 'used',
      checkedIn: true,
      checkedInAt: '2024-02-20T08:15:00',
      bookingReference: 'BK789457'
    }
  ];

  const handleScanQR = () => {
    setIsScanning(true);
    // Simulate QR scanning
    setTimeout(() => {
      setScanResult('TK001234');
      setIsScanning(false);
    }, 2000);
  };

  const validateTicket = (ticketNumber: string) => {
    const ticket = tickets.find(t => t.ticketNumber === ticketNumber);
    if (!ticket) return { valid: false, message: 'تذكرة غير صحيحة' };
    if (ticket.checkedIn) return { valid: false, message: 'تم استخدام التذكرة مسبقاً' };
    if (ticket.status !== 'active') return { valid: false, message: 'تذكرة غير فعالة' };
    return { valid: true, message: 'تذكرة صحيحة', ticket };
  };

  const checkInTicket = (ticketNumber: string) => {
    // Mock check-in process
    console.log('تسجيل حضور للتذكرة:', ticketNumber);
  };

  const getStatusBadge = (status: string, checkedIn: boolean) => {
    if (checkedIn) {
      return <Badge className="bg-green-100 text-green-800">تم الحضور</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">فعالة</Badge>;
      case 'expired':
        return <Badge variant="destructive">منتهية الصلاحية</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">ملغاة</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">التذاكر والحضور</h1>

          <Tabs defaultValue="my-tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-tickets">تذاكري</TabsTrigger>
              <TabsTrigger value="scan-qr">مسح QR</TabsTrigger>
            </TabsList>

            {/* My Tickets Tab */}
            <TabsContent value="my-tickets" className="space-y-6">
              <div className="grid gap-6">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-3 gap-0">
                        {/* Ticket Info */}
                        <div className="md:col-span-2 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">{ticket.eventTitle}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {ticket.eventDate} • {ticket.eventTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {ticket.eventLocation}
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(ticket.status, ticket.checkedIn)}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">رقم التذكرة</p>
                              <p className="font-mono">{ticket.ticketNumber}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">اسم الحامل</p>
                              <p>{ticket.holderName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">رقم الحجز</p>
                              <p className="font-mono">{ticket.bookingReference}</p>
                            </div>
                            {ticket.checkedIn && (
                              <div>
                                <p className="text-muted-foreground">وقت الحضور</p>
                                <p>{new Date(ticket.checkedInAt!).toLocaleString('ar-SA')}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 ml-2" />
                              تحميل
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="w-4 h-4 ml-2" />
                              مشاركة
                            </Button>
                            {ticket.checkedIn && (
                              <Button size="sm" variant="outline">
                                <Star className="w-4 h-4 ml-2" />
                                تقييم الفعالية
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="border-r border-dashed bg-muted/30 p-6 flex flex-col items-center justify-center">
                          <div className="w-32 h-32 bg-white rounded-lg p-2 mb-4 border">
                            <img 
                              src={ticket.qrCode} 
                              alt="QR Code" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            اعرض هذا الكود عند الوصول
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* QR Scanner Tab */}
            <TabsContent value="scan-qr" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>مسح رمز QR للتذاكر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Camera Scanner */}
                  <div className="text-center">
                    <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                      {isScanning ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="text-sm">جاري المسح...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-16 h-16 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">اضغط لبدء المسح</p>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleScanQR} disabled={isScanning}>
                      <Camera className="w-4 h-4 ml-2" />
                      {isScanning ? 'جاري المسح...' : 'ابدأ مسح QR'}
                    </Button>
                  </div>

                  {/* Manual Entry */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">إدخال يدوي لرقم التذكرة</h3>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="أدخل رقم التذكرة (مثال: TK001234)"
                        value={scanResult}
                        onChange={(e) => setScanResult(e.target.value)}
                      />
                      <Button 
                        onClick={() => {
                          if (scanResult) {
                            const result = validateTicket(scanResult);
                            console.log(result);
                          }
                        }}
                      >
                        تحقق
                      </Button>
                    </div>
                  </div>

                  {/* Scan Result */}
                  {scanResult && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">نتيجة المسح</h4>
                            <p className="text-sm text-muted-foreground">رقم التذكرة: {scanResult}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-600 font-semibold">تذكرة صحيحة</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted-foreground">الفعالية</p>
                              <p>هايكنج جبل طويق المتقدم</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">الحامل</p>
                              <p>أحمد محمد</p>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={() => checkInTicket(scanResult)}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            تأكيد الحضور
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scan Guidelines */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">إرشادات المسح</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• تأكد من وضوح رمز QR في الإطار</li>
                        <li>• يمكن المسح قبل 30 دقيقة من بداية الفعالية</li>
                        <li>• كل تذكرة يمكن استخدامها مرة واحدة فقط</li>
                        <li>• سيتم منح النقاط تلقائياً بعد تسجيل الحضور</li>
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