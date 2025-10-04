import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Users, CheckCircle, XCircle, Clock, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  user_id: string;
  quantity: number;
  status: string;
  created_at: string;
  total_amount: number;
  booking_reference: string;
  profile?: {
    full_name: string;
    avatar_url: string;
    phone: string;
  };
  tickets?: Array<{
    id: string;
    ticket_number: string;
    holder_name: string;
    status: string;
    checked_in_at: string;
  }>;
}

interface Event {
  id: string;
  title: string;
  title_ar: string;
  start_date: string;
  location: string;
  max_attendees: number;
  current_attendees: number;
}

const EventParticipants = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (eventId && user) {
      fetchEventAndParticipants();
    }
  }, [eventId, user]);

  const fetchEventAndParticipants = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      
      // Check if user is organizer or admin
      if (eventData.organizer_id !== user?.id && userRole !== 'admin') {
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحية لعرض المشاركين",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setEvent(eventData);

      // Fetch participants with profiles and tickets
      const { data: participantsData, error: participantsError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            phone
          ),
          tickets (
            id,
            ticket_number,
            holder_name,
            status,
            checked_in_at
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.booking_reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'confirmed') return matchesSearch && participant.status === 'confirmed';
    if (activeTab === 'pending') return matchesSearch && participant.status === 'pending';
    if (activeTab === 'checked-in') return matchesSearch && participant.tickets?.some(t => t.checked_in_at);
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'مؤكد', variant: 'default' as const, icon: CheckCircle },
      pending: { label: 'في الانتظار', variant: 'secondary' as const, icon: Clock },
      cancelled: { label: 'ملغي', variant: 'destructive' as const, icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">الفعالية غير موجودة</h1>
            <Button onClick={() => navigate('/dashboard')}>
              العودة للوحة التحكم
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/manage-events')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            العودة لإدارة الفعاليات
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{event.title_ar}</h1>
              <p className="text-muted-foreground mt-1">
                إدارة المشاركين في الفعالية
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{event.current_attendees}</div>
                <div className="text-sm text-muted-foreground">مسجل</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{event.max_attendees || '∞'}</div>
                <div className="text-sm text-muted-foreground">الحد الأقصى</div>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              المشاركون ({filteredParticipants.length})
            </CardTitle>
            <CardDescription>
              قائمة بجميع الأشخاص المسجلين في هذه الفعالية
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم أو رقم الحجز..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">الكل ({participants.length})</TabsTrigger>
                <TabsTrigger value="confirmed">
                  مؤكد ({participants.filter(p => p.status === 'confirmed').length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  في الانتظار ({participants.filter(p => p.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="checked-in">
                  حضر ({participants.filter(p => p.tickets?.some(t => t.checked_in_at)).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {filteredParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={participant.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {participant.profile?.full_name?.charAt(0) || 'م'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <h3 className="font-semibold">
                            {participant.profile?.full_name || 'مشارك مجهول'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>#{participant.booking_reference}</span>
                            <span>•</span>
                            <span>{participant.quantity} تذكرة</span>
                            <span>•</span>
                            <span>{participant.total_amount} ر.س</span>
                          </div>
                          {participant.profile?.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {participant.profile.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(participant.status)}
                        {participant.tickets?.some(t => t.checked_in_at) && (
                          <Badge variant="outline" className="text-green-600">
                            حضر
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {participant.tickets && participant.tickets.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">التذاكر:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {participant.tickets.map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{ticket.holder_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  #{ticket.ticket_number}
                                </span>
                                {ticket.checked_in_at ? (
                                  <Badge variant="outline" className="text-green-600 text-xs">
                                    حضر
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    لم يحضر
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {filteredParticipants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'لم يتم العثور على مشاركين يطابقون البحث' : 'لا يوجد مشاركون في هذه الفعالية بعد'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default EventParticipants;