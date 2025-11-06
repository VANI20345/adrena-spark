import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import PaymentGateway from '@/components/Payment/PaymentGateway';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Wallet, 
  Gift, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  Star,
  Shield,
  AlertCircle,
  Timer,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { eventId, eventTitle, eventPrice, availableSeats = 10 } = location.state || {};
  const [currentStep, setCurrentStep] = useState(1);
  const [tickets, setTickets] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [seatReservationExpired, setSeatReservationExpired] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    specialRequests: ''
  });

  const [userPoints, setUserPoints] = useState(0);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const pointsValue = Math.min(Math.floor(userPoints * 0.1), 20);
  const basePrice = eventDetails?.price || eventPrice || 150;
  const vatRate = 0.15;
  
  const steps = [
    { id: 1, title: 'اختيار المقاعد', icon: Users },
    { id: 2, title: 'معلومات المشارك', icon: CheckCircle },
    { id: 3, title: 'المراجعة والدفع', icon: CreditCard }
  ];

  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  useEffect(() => {
    fetchEventDetails();
    fetchUserPoints();
    fetchAvailableCoupons();
  }, [eventId]);

  const fetchEventDetails = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!fk_events_organizer_id(full_name),
          categories(name_ar)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEventDetails(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "خطأ في تحميل بيانات الفعالية",
        description: "حدث خطأ أثناء تحميل تفاصيل الفعالية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setUserPoints(data?.points_balance || 0);
    } catch (error) {
      console.error('Error fetching user points:', error);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .or('valid_until.is.null,valid_until.gt.now()')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setAvailableCoupons([]);
    }
  };

  const eventData = eventDetails ? {
    title: eventDetails.title_ar,
    date: new Date(eventDetails.start_date).toLocaleDateString('ar-SA'),
    time: new Date(eventDetails.start_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    location: eventDetails.location_ar,
    organizer: eventDetails.profiles?.full_name || "منظم",
    difficulty: eventDetails.difficulty_level || "متوسط",
    maxParticipants: eventDetails.max_attendees || 25,
    availableSeats: eventDetails.max_attendees - eventDetails.current_attendees || 0,
    rating: 4.8, // Would come from rating_summaries table
    image: eventDetails.image_url || "/placeholder.svg",
    features: [
      "مرشد متخصص",
      "وجبة إفطار", 
      "معدات السلامة",
      "شهادة مشاركة"
    ],
    cancellationPolicy: eventDetails.cancellation_policy === 'flexible' ? "إلغاء مجاني حتى 24 ساعة قبل الموعد" : "إلغاء مجاني حتى 48 ساعة قبل الموعد"
  } : {
    title: eventTitle || "جاري التحميل...",
    date: "---",
    time: "---",
    location: "---",
    organizer: "---",
    difficulty: "---",
    maxParticipants: 0,
    availableSeats: 0,
    rating: 0,
    image: "/placeholder.svg",
    features: [],
    cancellationPolicy: "---"
  };

  // Price calculations
  const subtotal = basePrice * tickets;
  const couponDiscount = appliedCoupon ? 
    (appliedCoupon.type === 'percentage' ? 
      subtotal * (appliedCoupon.value / 100) : 
      appliedCoupon.value) : 0;
  const pointsDiscount = usePoints ? Math.min(pointsValue, subtotal * 0.1, 20) : 0;
  const discountedSubtotal = subtotal - couponDiscount - pointsDiscount;
  const vat = discountedSubtotal * vatRate;
  const total = discountedSubtotal + vat;

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft > 0 && !seatReservationExpired) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setSeatReservationExpired(true);
      toast({
        title: "انتهت مهلة الحجز",
        description: "تم تحرير المقاعد المحجوزة. يرجى إعادة الحجز.",
        variant: "destructive"
      });
    }
  }, [timeLeft, toast, seatReservationExpired]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const goToNextStep = () => {
    if (currentStep < steps.length) {
      if (currentStep === 2) {
        // Create booking before proceeding to payment
        createBooking();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return tickets > 0 && tickets <= eventData.availableSeats;
      case 2:
        return customerInfo.fullName && customerInfo.email && customerInfo.phone;
      case 3:
        return paymentMethod;
      default:
        return false;
    }
  };

  const applyCoupon = async () => {
    const coupon = availableCoupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());
    if (coupon) {
      // Check minimum amount requirement
      if (coupon.min_amount && subtotal < coupon.min_amount) {
        toast({
          title: "متطلب الحد الأدنى غير متحقق",
          description: `يتطلب هذا الكوبون حد أدنى ${coupon.min_amount} ريال`,
          variant: "destructive"
        });
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        toast({
          title: "انتهت صلاحية الكوبون",
          description: "تم استخدام هذا الكوبون للحد الأقصى المسموح",
          variant: "destructive"
        });
        return;
      }

      setAppliedCoupon(coupon);
      toast({
        title: "تم تطبيق الكوبون!",
        description: `تم تطبيق كوبون ${coupon.code} - ${coupon.description_ar || coupon.description}`
      });
      setCouponCode('');
    } else {
      toast({
        title: "كوبون غير صالح",
        description: "الكوبون المدخل غير صالح أو منتهي الصلاحية",
        variant: "destructive"
      });
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: "تم إزالة الكوبون",
      description: "تم إزالة الكوبون بنجاح"
    });
  };

  const handlePaymentSuccess = (paymentId: string) => {
    navigate('/checkout/success', {
      state: {
        eventId,
        tickets,
        total,
        bookingReference: bookingId,
        paymentId
      }
    });
  };

  const createBooking = async () => {
    if (bookingId) return; // Booking already created
    
    setCreatingBooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "خطأ في المصادقة",
          description: "يرجى تسجيل الدخول أولاً",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      const pointsToUse = usePoints ? Math.min(pointsDiscount, userPoints) : 0;

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          event_id: eventId,
          quantity: tickets,
          use_points: pointsToUse
        }
      });

      if (error) throw error;

      setBookingId(data.id);
      
      // Send group invitation notification instead of auto-adding
      const { data: groups } = await supabase
        .from('event_groups')
        .select('id, group_name, current_members, max_members')
        .eq('event_id', eventId)
        .limit(1);
      
      if (groups && groups.length > 0) {
        const group = groups[0];
        
        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!existingMember && group.current_members < group.max_members) {
          // Send invitation notification
          await supabase
            .from('notifications')
            .insert({
              user_id: session.user.id,
              type: 'group_invitation',
              title: 'دعوة للانضمام للمجموعة',
              message: `تمت دعوتك للانضمام إلى مجموعة "${group.group_name}"`,
              data: {
                group_id: group.id,
                group_name: group.group_name,
                event_id: eventId
              }
            });
        }
      }

      toast({
        title: "تم إنشاء الحجز",
        description: `رقم الحجز: ${data.booking_reference}`,
      });
    } catch (error) {
      console.error('Booking creation error:', error);
      toast({
        title: "فشل في إنشاء الحجز",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setCreatingBooking(false);
    }
  };

  const handlePaymentFailure = (error: string) => {
    toast({
      title: "فشل في الدفع",
      description: error,
      variant: "destructive"
    });
  };

  if (seatReservationExpired) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">انتهت مهلة الحجز</h1>
            <p className="text-muted-foreground mb-6">
              عذراً، انتهت مهلة الحجز وتم تحرير المقاعد المحجوزة. يرجى إعادة الحجز.
            </p>
            <Button onClick={() => navigate('/explore')}>
              العودة للفعاليات
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
              <span>جاري تحميل بيانات الفعالية...</span>
            </div>
          ) : (
          <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">إتمام الحجز</h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-orange-600">
                <Timer className="w-4 h-4" />
                <span>الوقت المتبقي: {formatTime(timeLeft)}</span>
              </div>
              <Badge variant="destructive" className="gap-1">
                <Clock className="w-3 h-3" />
                مقاعد محجوزة مؤقتاً
              </Badge>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`mr-2 text-sm font-medium ${
                      currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`mx-4 h-px w-16 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Seat Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Event Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        ملخص الفعالية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <img 
                          src={eventData.image} 
                          alt={eventData.title} 
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">{eventData.title}</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{eventData.date} • {eventData.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{eventData.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>منظم بواسطة: {eventData.organizer}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>{eventData.rating}/5 ({Math.floor(Math.random() * 50 + 10)} تقييم)</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{eventData.difficulty}</Badge>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">يشمل:</h4>
                        <div className="flex flex-wrap gap-2">
                          {eventData.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seat Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          اختيار عدد التذاكر
                        </span>
                        <span className="text-sm font-normal">
                          متبقي: <Badge variant="secondary">{eventData.availableSeats}</Badge> مقعد
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setTickets(Math.max(1, tickets - 1))}
                            disabled={tickets <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{tickets}</div>
                            <div className="text-xs text-muted-foreground">تذكرة</div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setTickets(Math.min(eventData.availableSeats, tickets + 1))}
                            disabled={tickets >= eventData.availableSeats}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{basePrice} ريال</div>
                          <div className="text-sm text-muted-foreground">شامل الضريبة</div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={((eventData.maxParticipants - eventData.availableSeats) / eventData.maxParticipants) * 100}
                        className="mt-4"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>محجوز: {eventData.maxParticipants - eventData.availableSeats}</span>
                        <span>متاح: {eventData.availableSeats}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Discounts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        الخصومات والعروض
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Coupon Code */}
                      <div>
                        <Label htmlFor="coupon">كود الخصم</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="coupon"
                            placeholder="أدخل كود الخصم (مثل: SAVE10)"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={!!appliedCoupon}
                          />
                          <Button 
                            onClick={applyCoupon} 
                            variant="outline"
                            disabled={!couponCode || !!appliedCoupon}
                          >
                            تطبيق
                          </Button>
                        </div>
                        {appliedCoupon && (
                          <div className="flex items-center justify-between mt-2 p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                تم تطبيق كود: {appliedCoupon.code}
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={removeCoupon}
                              className="text-green-700 hover:text-green-800"
                            >
                              إزالة
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Star className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <Label className="text-base">استخدام النقاط</Label>
                            <p className="text-sm text-muted-foreground">
                              لديك {userPoints} نقطة = {pointsValue} ريال
                              <br />
                              سيتم خصم تلقائياً حتى 10% (حد أقصى 20 ريال)
                            </p>
                          </div>
                        </div>
                        <Checkbox 
                          checked={usePoints} 
                          onCheckedChange={(checked) => setUsePoints(!!checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 2: Customer Information */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      معلومات المشارك
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">الاسم الكامل *</Label>
                        <Input
                          id="fullName"
                          placeholder="أدخل الاسم الكامل"
                          value={customerInfo.fullName}
                          onChange={(e) => setCustomerInfo(prev => ({
                            ...prev,
                            fullName: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">البريد الإلكتروني *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@email.com"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">رقم الجوال *</Label>
                        <Input
                          id="phone"
                          placeholder="05xxxxxxxx"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency">رقم الطوارئ</Label>
                        <Input
                          id="emergency"
                          placeholder="رقم جوال للطوارئ"
                          value={customerInfo.emergencyContact}
                          onChange={(e) => setCustomerInfo(prev => ({
                            ...prev,
                            emergencyContact: e.target.value
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="requests">طلبات خاصة</Label>
                      <Input
                        id="requests"
                        placeholder="أي طلبات خاصة أو ملاحظات..."
                        value={customerInfo.specialRequests}
                        onChange={(e) => setCustomerInfo(prev => ({
                          ...prev,
                          specialRequests: e.target.value
                        }))}
                      />
                    </div>

                    <Alert>
                      <Shield className="w-4 h-4" />
                      <AlertDescription>
                        سيتم استخدام هذه المعلومات لإرسال تأكيد الحجز وفي حالات الطوارئ فقط.
                        جميع المعلومات محمية ومشفرة.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>مراجعة الطلب</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>الفعالية:</span>
                          <span className="font-medium">{eventData.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>التاريخ:</span>
                          <span>{eventData.date} • {eventData.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>عدد التذاكر:</span>
                          <span>{tickets} تذكرة</span>
                        </div>
                        <div className="flex justify-between">
                          <span>المشارك:</span>
                          <span>{customerInfo.fullName}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <PaymentGateway
                    amount={total}
                    booking_id={bookingId}
                    description={`حجز ${eventData.title} - ${tickets} تذكرة`}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentFailure={handlePaymentFailure}
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button 
                  variant="outline" 
                  onClick={goToPrevStep}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  السابق
                </Button>
                
                {currentStep < steps.length && (
                  <Button 
                    onClick={goToNextStep}
                    disabled={!validateStep() || creatingBooking}
                    className="gap-2"
                  >
                    {creatingBooking ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                        جاري إنشاء الحجز...
                      </>
                    ) : (
                      <>
                        التالي
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    ملخص الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>السعر ({tickets} تذكرة)</span>
                    <span>{subtotal.toFixed(2)} ريال</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>خصم الكوبون ({appliedCoupon.code})</span>
                      <span>-{couponDiscount.toFixed(2)} ريال</span>
                    </div>
                  )}
                  
                  {usePoints && pointsDiscount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>خصم النقاط</span>
                      <span>-{pointsDiscount.toFixed(2)} ريال</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{discountedSubtotal.toFixed(2)} ريال</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>ضريبة القيمة المضافة (15%)</span>
                    <span>{vat.toFixed(2)} ريال</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary">{total.toFixed(2)} ريال</span>
                  </div>

                  {/* Cancellation Policy */}
                  <div className="mt-6 p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-1">سياسة الإلغاء</h4>
                    <p className="text-xs text-muted-foreground">
                      {eventData.cancellationPolicy}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutPage;