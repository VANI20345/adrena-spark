import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Calendar,
  MapPin,
  Star
} from 'lucide-react';

interface ServiceRequest {
  id: string;
  service_id: string;
  event_id: string;
  organizer_id: string;
  provider_id: string;
  message: string;
  requested_price: number;
  negotiated_price: number;
  response_message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  created_at: string;
  updated_at: string;
  service: {
    name_ar: string;
    name: string;
    description_ar: string;
    price: number;
    image_url: string;
  };
  event: {
    title_ar: string;
    title: string;
    start_date: string;
    location_ar: string;
  };
  organizer_profile: {
    full_name: string;
    avatar_url: string;
  };
}

const ServiceRequestsPage = () => {
  const { user, userRole } = useAuth();
  const { t, language } = useLanguageContext();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [responseMessage, setResponseMessage] = useState('');
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user && userRole) {
      loadServiceRequests();
    }
  }, [user, userRole, activeTab]);

  const loadServiceRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          service:services(name_ar, name, description_ar, price, image_url),
          event:events(title_ar, title, start_date, location_ar),
          organizer_profile:profiles!organizer_id(full_name, avatar_url)
        `);

      // Filter based on user role and tab
      if (userRole === 'provider') {
        if (activeTab === 'received') {
          query = query.eq('provider_id', user.id);
        } else {
          // For providers, "sent" requests would be responses to organizer requests
          query = query.eq('provider_id', user.id).neq('status', 'pending');
        }
      } else if (userRole === 'organizer') {
        if (activeTab === 'sent') {
          query = query.eq('organizer_id', user.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as unknown as ServiceRequest[]);
    } catch (error) {
      console.error('Error loading service requests:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResponse = async (requestId: string, action: 'accept' | 'reject' | 'negotiate') => {
    try {
      let status: 'pending' | 'accepted' | 'rejected' | 'negotiating' = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'negotiating';

      const updateData: any = {
        status,
        response_message: responseMessage,
      };

      if (action === 'negotiate' && negotiatedPrice) {
        updateData.negotiated_price = parseFloat(negotiatedPrice);
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(t('updateSuccessful'));
      setResponseMessage('');
      setNegotiatedPrice('');
      setSelectedRequest(null);
      loadServiceRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', text: 'قيد الانتظار' },
      accepted: { variant: 'default', text: 'مقبول' },
      rejected: { variant: 'destructive', text: 'مرفوض' },
      negotiating: { variant: 'outline', text: 'قيد التفاوض' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const RequestCard = ({ request }: { request: ServiceRequest }) => (
    <Card key={request.id} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">
              {language === 'ar' ? request.service.name_ar : request.service.name}
            </CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(request.event.start_date).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{request.event.location_ar}</span>
                </div>
              </div>
            </CardDescription>
          </div>
          <div className="text-left">
            {getStatusBadge(request.status)}
            <div className="text-sm text-muted-foreground mt-1">
              {new Date(request.created_at).toLocaleDateString('ar-SA')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold mb-2">تفاصيل الطلب:</h4>
            <p className="text-sm text-muted-foreground mb-2">{request.message}</p>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              <span>السعر المطلوب: {request.requested_price || request.service.price} ر.س</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">الفعالية:</h4>
            <p className="text-sm font-medium">{request.event.title_ar}</p>
            <p className="text-sm text-muted-foreground">
              {request.organizer_profile?.full_name}
            </p>
          </div>
        </div>

        {request.negotiated_price && (
          <div className="bg-secondary p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">السعر المفاوض: {request.negotiated_price} ر.س</span>
            </div>
          </div>
        )}

        {request.response_message && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <h5 className="font-semibold mb-1">رد مقدم الخدمة:</h5>
            <p className="text-sm">{request.response_message}</p>
          </div>
        )}

        {/* Response form for providers */}
        {userRole === 'provider' && request.status === 'pending' && (
          <div className="border-t pt-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="response">ردك على الطلب</Label>
                <Textarea
                  id="response"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="negotiated-price">السعر المقترح (اختياري)</Label>
                <Input
                  id="negotiated-price"
                  type="number"
                  value={negotiatedPrice}
                  onChange={(e) => setNegotiatedPrice(e.target.value)}
                  placeholder="السعر الجديد بالريال"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleRequestResponse(request.id, 'accept')}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  قبول الطلب
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleRequestResponse(request.id, 'negotiate')}
                  className="gap-2"
                  disabled={!responseMessage}
                >
                  <MessageSquare className="h-4 w-4" />
                  تفاوض
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => handleRequestResponse(request.id, 'reject')}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  رفض الطلب
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">طلبات الخدمات</h1>
            <p className="text-muted-foreground">
              {userRole === 'provider' 
                ? 'إدارة طلبات ربط الخدمات الواردة إليك'
                : 'تتبع طلبات ربط الخدمات التي أرسلتها'
              }
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{requests.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">طلبات مقبولة</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'accepted').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل القبول</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {requests.length > 0 
                    ? Math.round((requests.filter(r => r.status === 'accepted').length / requests.length) * 100)
                    : 0
                  }%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              {userRole === 'provider' ? (
                <>
                  <TabsTrigger value="received">
                    الطلبات الواردة ({requests.filter(r => r.status === 'pending').length})
                  </TabsTrigger>
                  <TabsTrigger value="processed">
                    الطلبات المعالجة ({requests.filter(r => r.status !== 'pending').length})
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="sent">
                    الطلبات المرسلة ({requests.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    السجل ({requests.filter(r => ['accepted', 'rejected'].includes(r.status)).length})
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : requests.length > 0 ? (
                <div className="space-y-4">
                  {requests
                    .filter(request => {
                      if (activeTab === 'received') return request.status === 'pending';
                      if (activeTab === 'processed') return request.status !== 'pending';
                      if (activeTab === 'history') return ['accepted', 'rejected'].includes(request.status);
                      return true;
                    })
                    .map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
                    <p className="text-muted-foreground text-center">
                      {userRole === 'provider' 
                        ? 'لم تستلم أي طلبات ربط خدمات حتى الآن'
                        : 'لم ترسل أي طلبات ربط خدمات حتى الآن'
                      }
                    </p>
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

export default ServiceRequestsPage;