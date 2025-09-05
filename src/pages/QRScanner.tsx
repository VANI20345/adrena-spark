import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle
} from 'lucide-react';

const QRScanner = () => {
  const { user, userRole } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (userRole === 'organizer') {
      loadAttendanceHistory();
    }
  }, [userRole]);

  const loadAttendanceHistory = async () => {
    try {
      // Load recent check-ins for organizer's events
      const { data } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings(
            *,
            events(title_ar, start_date)
          )
        `)
        .not('checked_in_at', 'is', null)
        .order('checked_in_at', { ascending: false })
        .limit(10);

      setAttendanceHistory(data || []);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    setError('');
    
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('لا يمكن الوصول للكاميرا. تأكد من منح الصلاحية.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleManualEntry = async (ticketNumber: string) => {
    try {
      // Validate and check-in ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings(
            *,
            events(title_ar, start_date, organizer_id)
          )
        `)
        .eq('ticket_number', ticketNumber)
        .single();

      if (error || !ticket) {
        setError('رقم التذكرة غير صحيح');
        return;
      }

      // Check if user is authorized to check-in this ticket
      if (ticket.bookings.events.organizer_id !== user?.id && userRole !== 'admin') {
        setError('لا تملك صلاحية لتأكيد حضور هذه التذكرة');
        return;
      }

      // Check if already checked in
      if (ticket.checked_in_at) {
        setError('تم تأكيد الحضور مسبقاً');
        setScanResult(ticket);
        return;
      }

      // Check-in the ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id
        })
        .eq('id', ticket.id);

      if (updateError) {
        setError('حدث خطأ أثناء تأكيد الحضور');
        return;
      }

      setScanResult({ ...ticket, checked_in_at: new Date().toISOString() });
      loadAttendanceHistory();
      
    } catch (error) {
      console.error('Error processing check-in:', error);
      setError('حدث خطأ غير متوقع');
    }
  };

  // Simulate QR code scanning (in real implementation, you'd use a QR scanner library)
  const simulateQRScan = () => {
    // For demo purposes, simulate scanning a ticket
    handleManualEntry('TICKET123456');
  };

  if (userRole !== 'organizer' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              هذه الصفحة متاحة فقط للمنظمين والمديرين
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">مسح QR للحضور</h1>
          <p className="text-muted-foreground">تأكيد حضور المشاركين في فعالياتك</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="w-5 h-5 ml-2" />
                ماسح QR
              </CardTitle>
              <CardDescription>
                امسح رمز QR الموجود على التذكرة لتأكيد الحضور
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isScanning ? (
                <div className="text-center">
                  <div className="w-64 h-64 mx-auto bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                    <Camera className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <Button onClick={startScanning} className="w-full">
                    <Camera className="w-4 h-4 ml-2" />
                    بدء المسح
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="relative w-64 h-64 mx-auto bg-black rounded-lg overflow-hidden mb-4">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                    <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary bg-primary/10"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={simulateQRScan} className="flex-1">
                      مسح تجريبي
                    </Button>
                    <Button onClick={stopScanning} variant="outline" className="flex-1">
                      إيقاف
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">إدخال يدوي</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="رقم التذكرة"
                    className="flex-1 px-3 py-2 border rounded-md"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualEntry((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <Button 
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="رقم التذكرة"]') as HTMLInputElement;
                      handleManualEntry(input.value);
                    }}
                  >
                    تأكيد
                  </Button>
                </div>
              </div>

              {error && (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {scanResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {scanResult.checked_in_at ? 
                      `تم تأكيد الحضور للتذكرة ${scanResult.ticket_number}` :
                      'تذكرة صالحة - تم تأكيد الحضور بنجاح'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Scan Result & History */}
          <div className="space-y-6">
            {scanResult && (
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل التذكرة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">رقم التذكرة:</span>
                      <span className="font-mono">{scanResult.ticket_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">اسم الحامل:</span>
                      <span>{scanResult.holder_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">الفعالية:</span>
                      <span>{scanResult.bookings?.events?.title_ar}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">حالة الحضور:</span>
                      <Badge variant={scanResult.checked_in_at ? 'default' : 'secondary'}>
                        {scanResult.checked_in_at ? 'تم الحضور' : 'لم يحضر'}
                      </Badge>
                    </div>
                    {scanResult.checked_in_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">وقت الحضور:</span>
                        <span className="text-sm">
                          {new Date(scanResult.checked_in_at).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور الأخير</CardTitle>
                <CardDescription>آخر 10 عمليات تأكيد حضور</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendanceHistory.map((attendance: any) => (
                    <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{attendance.holder_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {attendance.bookings?.events?.title_ar}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">تم الحضور</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(attendance.checked_in_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {attendanceHistory.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">لا يوجد سجل حضور حتى الآن</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QRScanner;