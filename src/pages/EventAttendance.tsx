import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, QrCode, ScanLine, CheckCircle2, Circle, User, Ticket, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SmartQRScanner from '@/components/QR/SmartQRScanner';

interface TicketRow {
  id: string;
  booking_id: string;
  ticket_number: string;
  qr_code: string;
  holder_name: string;
  status: string;
  checked_in_at: string | null;
}

interface AttendeeGroup {
  bookingId: string;
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  quantity: number;
  tickets: TicketRow[];
}

const EventAttendance = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [attendees, setAttendees] = useState<AttendeeGroup[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!user || !eventId) return;
      setLoading(true);
      try {
        // 1) Verify ownership
        const { data: ev, error: evErr } = await supabase
          .from('events')
          .select('id, title, title_ar, organizer_id')
          .eq('id', eventId)
          .maybeSingle();
        if (evErr) throw evErr;
        if (!ev) {
          setAuthorized(false);
          return;
        }
        if (ev.organizer_id !== user.id) {
          setAuthorized(false);
          toast({
            title: isRTL ? 'غير مصرح' : 'Unauthorized',
            description: isRTL ? 'هذه الصفحة متاحة لمنظّم الفعالية فقط' : 'This page is available to the event organizer only',
            variant: 'destructive',
          });
          return;
        }
        setAuthorized(true);
        setEventTitle(isRTL ? (ev.title_ar || ev.title) : (ev.title || ev.title_ar));

        // 2) Fetch bookings for this event
        const { data: bookings, error: bErr } = await supabase
          .from('bookings')
          .select('id, user_id, quantity, status')
          .eq('event_id', eventId)
          .in('status', ['confirmed', 'paid', 'completed']);
        if (bErr) throw bErr;

        const bookingIds = (bookings || []).map(b => b.id);
        const userIds = Array.from(new Set((bookings || []).map(b => b.user_id)));

        // 3) Fetch tickets + attendee profiles in parallel
        const [ticketsRes, profilesRes] = await Promise.all([
          bookingIds.length
            ? supabase
                .from('tickets')
                .select('id, booking_id, ticket_number, qr_code, holder_name, status, checked_in_at')
                .in('booking_id', bookingIds)
            : Promise.resolve({ data: [], error: null } as any),
          userIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .in('id', userIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (ticketsRes.error) throw ticketsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const ticketsByBooking = new Map<string, TicketRow[]>();
        for (const t of (ticketsRes.data as TicketRow[]) || []) {
          const arr = ticketsByBooking.get(t.booking_id) || [];
          arr.push(t);
          ticketsByBooking.set(t.booking_id, arr);
        }

        const profileById = new Map<string, any>();
        for (const p of (profilesRes.data as any[]) || []) {
          profileById.set(p.id, p);
        }

        const grouped: AttendeeGroup[] = (bookings || []).map(b => {
          const profile = profileById.get(b.user_id) || {};
          return {
            bookingId: b.id,
            userId: b.user_id,
            fullName: profile.full_name || (isRTL ? 'مستخدم' : 'User'),
            email: profile.email,
            phone: profile.phone,
            quantity: b.quantity || 0,
            tickets: ticketsByBooking.get(b.id) || [],
          };
        });

        setAttendees(grouped);
      } catch (err: any) {
        console.error('EventAttendance load failed', err);
        toast({
          title: isRTL ? 'تعذّر تحميل البيانات' : 'Failed to load data',
          description: err?.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, eventId, isRTL, refreshTick, toast]);

  const totalTickets = useMemo(
    () => attendees.reduce((s, a) => s + a.tickets.length, 0),
    [attendees]
  );
  const checkedInCount = useMemo(
    () => attendees.reduce((s, a) => s + a.tickets.filter(t => t.status === 'used' || t.checked_in_at).length, 0),
    [attendees]
  );

  const checkInByCode = async (code: string, method: 'qr_code' | 'manual') => {
    const clean = (code || '').trim();
    if (!clean) return;
    try {
      // Find candidate ticket
      const { data: matches, error: findErr } = await supabase
        .from('tickets')
        .select('id, ticket_number, qr_code, status, booking_id, bookings!inner(event_id)')
        .or(`ticket_number.eq.${clean},qr_code.eq.${clean}`)
        .limit(5);
      if (findErr) throw findErr;

      const ticket = (matches || []).find((t: any) => t.bookings?.event_id === eventId);
      if (!ticket) {
        toast({
          title: isRTL ? 'تذكرة غير صالحة' : 'Invalid ticket',
          description: isRTL ? 'لم يتم العثور على التذكرة لهذه الفعالية' : 'Ticket not found for this event',
          variant: 'destructive',
        });
        return;
      }
      if (ticket.status !== 'active') {
        toast({
          title: isRTL ? 'التذكرة مستخدمة' : 'Already checked in',
          description: isRTL ? 'تم تسجيل حضور هذه التذكرة مسبقاً' : 'This ticket has already been checked in',
          variant: 'destructive',
        });
        return;
      }

      const { error: updErr, data: updated } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id,
          check_in_method: method,
        })
        .eq('id', ticket.id)
        .eq('status', 'active')
        .select('id');

      if (updErr) throw updErr;
      if (!updated || updated.length === 0) {
        toast({
          title: isRTL ? 'لم يتم التحديث' : 'Update rejected',
          description: isRTL ? 'قد يكون تم تسجيل الحضور من جهاز آخر' : 'The ticket may have been checked in elsewhere',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: isRTL ? 'تم تسجيل الحضور' : 'Checked in',
        description: `#${ticket.ticket_number}`,
      });
      setManualCode('');
      setRefreshTick(x => x + 1);
    } catch (err: any) {
      console.error('Check-in failed', err);
      toast({
        title: isRTL ? 'فشل تسجيل الحضور' : 'Check-in failed',
        description: err?.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">{isRTL ? 'الوصول مرفوض' : 'Access denied'}</h1>
          <p className="text-muted-foreground mb-6">
            {isRTL ? 'هذه الصفحة متاحة لمنظّم الفعالية فقط.' : 'This page is only available to the event organizer.'}
          </p>
          <Button onClick={() => navigate('/')}>{isRTL ? 'العودة للرئيسية' : 'Back home'}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold mb-1">{isRTL ? 'إدارة الحضور' : 'Attendance Management'}</h1>
          <p className="text-muted-foreground mb-6">{eventTitle}</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'إجمالي الحاضرين' : 'Attendees'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{attendees.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'إجمالي التذاكر' : 'Total tickets'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{totalTickets}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isRTL ? 'تم تسجيل الحضور' : 'Checked in'}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-success">{checkedInCount}/{totalTickets}</div></CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <Button onClick={() => setScannerOpen(true)} className="gap-2">
              <ScanLine className="h-4 w-4" />
              {isRTL ? 'مسح رمز التذكرة' : 'Scan QR ticket'}
            </Button>
            <div className="flex gap-2 flex-1">
              <Input
                placeholder={isRTL ? 'أدخل رقم التذكرة يدوياً' : 'Enter ticket code manually'}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className={isRTL ? 'text-right' : 'text-left'}
              />
              <Button
                variant="secondary"
                onClick={() => checkInByCode(manualCode, 'manual')}
                disabled={!manualCode.trim()}
              >
                {isRTL ? 'تسجيل الحضور' : 'Check in'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendees */}
        {attendees.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {isRTL ? 'لا يوجد حاضرون مسجّلون لهذه الفعالية بعد.' : 'No attendees registered for this event yet.'}
          </CardContent></Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {attendees.map((a) => {
              const checked = a.tickets.filter(t => t.status === 'used' || t.checked_in_at).length;
              return (
                <AccordionItem key={a.bookingId} value={a.bookingId} className="border rounded-lg bg-card px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className={`flex-1 flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{a.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[a.email, a.phone].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Ticket className="h-3 w-3" />
                        {checked}/{a.tickets.length || a.quantity}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {a.tickets.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        {isRTL
                          ? `تم شراء ${a.quantity} تذكرة، ولكن لا توجد سجلات تذاكر منفصلة (يتطلب تعديل خلفي لإصدار التذاكر).`
                          : `Purchased ${a.quantity} ticket(s), but no per-ticket records exist yet (backend ticket generation required).`}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 py-3">
                        {a.tickets.map((t) => {
                          const isCheckedIn = t.status === 'used' || !!t.checked_in_at;
                          return (
                            <Card key={t.id} className={isCheckedIn ? 'border-success/40' : ''}>
                              <CardContent className="p-4 space-y-2 text-center">
                                <div className="mx-auto w-24 h-24 bg-white rounded-lg p-2 border">
                                  <QRCodeSVG value={t.qr_code} size={80} level="H" includeMargin={false} />
                                </div>
                                <div className="font-mono text-xs text-primary break-all">{t.ticket_number}</div>
                                <div className="flex items-center justify-center gap-1 text-xs">
                                  {isCheckedIn ? (
                                    <><CheckCircle2 className="h-4 w-4 text-success" /> <span className="text-success">{isRTL ? 'حاضر' : 'Checked In'}</span></>
                                  ) : (
                                    <><Circle className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground">{isRTL ? 'غير مسجّل' : 'Not Checked In'}</span></>
                                  )}
                                </div>
                                {!isCheckedIn && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full gap-1"
                                    onClick={() => checkInByCode(t.ticket_number, 'manual')}
                                  >
                                    <QrCode className="h-3 w-3" />
                                    {isRTL ? 'تسجيل حضور' : 'Check in'}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={() => setScannerOpen(false)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
            <SmartQRScanner
              eventId={eventId}
              organizerMode
              onScanResult={(res: any) => {
                const code = res?.qrData?.ticketId || res?.qrData?.qrCode || res?.qrData?.raw || '';
                if (code) {
                  setScannerOpen(false);
                  checkInByCode(code, 'qr_code');
                }
              }}
            />
          </div>
        </div>
      )}


      <Footer />
    </div>
  );
};

export default EventAttendance;
