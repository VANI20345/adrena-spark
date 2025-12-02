import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  Calendar, 
  MapPin, 
  Download,
  Share2,
  Camera,
  CheckCircle,
  Star,
  Loader2
} from 'lucide-react';

const Tickets = () => {
  const [scanResult, setScanResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguageContext();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUserTickets();
  }, [user]);

  const fetchUserTickets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings!fk_tickets_booking_id(
            *,
            events!fk_bookings_event_id(
              title_ar,
              start_date,
              location_ar,
              organizer_id,
              profiles!fk_events_organizer_id(full_name)
            )
          )
        `)
        .eq('bookings.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: t('tickets.errorLoadingTickets'),
        description: t('tickets.errorLoadingTicketsDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
    if (!ticket) return { valid: false, message: t('tickets.statusUnknown') };
    if (ticket.checkedIn) return { valid: false, message: t('tickets.statusCheckedIn') };
    if (ticket.status !== 'active') return { valid: false, message: t('tickets.statusExpired') };
    return { valid: true, message: t('tickets.validTicket'), ticket };
  };

  const checkInTicket = (ticketNumber: string) => {
    console.log('Check-in ticket:', ticketNumber);
  };

  const getStatusBadge = (status: string, checkedInAt: string | null) => {
    if (checkedInAt) {
      return <Badge className="bg-green-100 text-green-800">{t('tickets.statusCheckedIn')}</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">{t('tickets.statusActive')}</Badge>;
      case 'expired':
        return <Badge variant="destructive">{t('tickets.statusExpired')}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">{t('tickets.statusCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{t('tickets.statusUnknown')}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{t('tickets.title')}</h1>

          <Tabs defaultValue="my-tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-tickets">{t('tickets.myTickets')}</TabsTrigger>
              <TabsTrigger value="scan-qr">{t('tickets.scanQR')}</TabsTrigger>
            </TabsList>

            {/* My Tickets Tab */}
            <TabsContent value="my-tickets" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" />
                  <span>{t('tickets.loadingTickets')}</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('tickets.noTickets')}</h3>
                  <p className="text-muted-foreground">{t('tickets.noTicketsDesc')}</p>
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
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{ticket.bookings?.events?.title_ar}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(ticket.bookings?.events?.start_date)} • {formatTime(ticket.bookings?.events?.start_date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {ticket.bookings?.events?.location_ar}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(ticket.status, ticket.checked_in_at)}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">{t('tickets.ticketNumber')}</p>
                              <p className="font-mono">{ticket.ticketNumber}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('tickets.holderName')}</p>
                              <p>{ticket.holder_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('tickets.bookingReference')}</p>
                              <p className="font-mono">{ticket.bookings?.booking_reference}</p>
                            </div>
                            {ticket.checked_in_at && (
                              <div>
                                <p className="text-muted-foreground">{t('tickets.attendanceTime')}</p>
                                <p>{new Date(ticket.checked_in_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 ml-2" />
                              {t('tickets.download')}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="w-4 h-4 ml-2" />
                              {t('tickets.share')}
                            </Button>
                            {ticket.checked_in_at && (
                              <Button size="sm" variant="outline">
                                <Star className="w-4 h-4 ml-2" />
                                {t('tickets.rateEvent')}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="border-r border-dashed bg-muted/30 p-6 flex flex-col items-center justify-center">
                          <div className="w-32 h-32 bg-white rounded-lg p-2 mb-4 border">
                            <img 
                              src={ticket.qr_code || `/api/qr?data=${ticket.ticket_number}`} 
                              alt="QR Code" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            {t('tickets.showQRCode')}
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
                  <CardTitle>{t('tickets.scanQRTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Camera Scanner */}
                  <div className="text-center">
                    <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                      {isScanning ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="text-sm">{t('tickets.scanning')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-16 h-16 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{t('tickets.clickToScan')}</p>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleScanQR} disabled={isScanning}>
                      <Camera className="w-4 h-4 ml-2" />
                      {isScanning ? t('tickets.scanning') : t('tickets.startScan')}
                    </Button>
                  </div>

                  {/* Manual Entry */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">{t('tickets.manualEntry')}</h3>
                    <div className="flex gap-2">
                      <Input 
                        placeholder={t('tickets.enterTicketNumber')}
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
                        {t('tickets.verify')}
                      </Button>
                    </div>
                  </div>

                  {/* Scan Result */}
                  {scanResult && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{t('tickets.scanResult')}</h4>
                            <p className="text-sm text-muted-foreground">{t('tickets.ticketNumber')}: {scanResult}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-600 font-semibold">{t('tickets.validTicket')}</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted-foreground">{t('tickets.event')}</p>
                              <p>Hiking Tuwaiq Mountain Advanced</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('tickets.holder')}</p>
                              <p>Ahmed Mohammed</p>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={() => checkInTicket(scanResult)}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            {t('tickets.confirmAttendance')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scan Guidelines */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">{t('tickets.scanGuidelines')}</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• {t('tickets.guideline1')}</li>
                        <li>• {t('tickets.guideline2')}</li>
                        <li>• {t('tickets.guideline3')}</li>
                        <li>• {t('tickets.guideline4')}</li>
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
