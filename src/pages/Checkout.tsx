import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  CreditCard, 
  Clock, 
  Users, 
  Gift, 
  Star, 
  Minus, 
  Plus,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const Checkout = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [tickets, setTickets] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock event data
  const event = {
    id: eventId,
    title: "هايكنج جبل طويق المتقدم",
    image: "/api/placeholder/400/200",
    date: "2024-03-15",
    time: "06:00",
    location: "الرياض",
    organizer: "نادي المغامرات الرياض",
    price: 200,
    maxAttendees: 25,
    currentAttendees: 18,
    availableSeats: 7
  };

  // Mock user data
  const user = {
    points: 50,
    pointsValue: 33.33 // 50 points = 33.33 SAR (150 SAR = 10 points)
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired, release seats
          navigate('/explore');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const subtotal = event.price * tickets;
  const couponDiscount = appliedCoupon ? (appliedCoupon.type === 'percentage' ? subtotal * (appliedCoupon.value / 100) : appliedCoupon.value) : 0;
  const pointsDiscount = usePoints ? Math.min(user.pointsValue, subtotal * 0.1, 20) : 0;
  const vat = (subtotal - couponDiscount - pointsDiscount) * 0.15;
  const total = subtotal - couponDiscount - pointsDiscount + vat;

  const applyCoupon = () => {
    // Mock coupon validation
    if (couponCode === 'SAVE10') {
      setAppliedCoupon({ code: 'SAVE10', type: 'percentage', value: 10 });
    } else if (couponCode === 'FLAT50') {
      setAppliedCoupon({ code: 'FLAT50', type: 'fixed', value: 50 });
    }
  };

  const proceedToPayment = () => {
    if (tickets > event.availableSeats) {
      return;
    }
    setStep(2);
  };

  const processPayment = async () => {
    if (!paymentMethod) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      navigate('/checkout/success', { 
        state: { 
          eventId: event.id, 
          tickets, 
          total,
          bookingReference: 'BK' + Date.now()
        }
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">إتمام الحجز</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                الوقت المتبقي: {formatTime(timeLeft)}
              </span>
              <Badge variant="destructive">
                مقاعد محجوزة مؤقتاً
              </Badge>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                  1
                </div>
                <span className="mr-2 text-sm">اختيار المقاعد</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                  2
                </div>
                <span className="mr-2 text-sm">الدفع</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {step === 1 && (
                <>
                  {/* Event Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>ملخص الفعالية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <img src={event.image} alt={event.title} className="w-20 h-20 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-muted-foreground text-sm">{event.date} • {event.time}</p>
                          <p className="text-muted-foreground text-sm">{event.location}</p>
                          <p className="text-muted-foreground text-sm">منظم بواسطة: {event.organizer}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seat Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        اختيار عدد التذاكر
                        <span className="text-sm font-normal text-muted-foreground">
                          متبقي: {event.availableSeats} مقعد
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
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-xl font-semibold w-8 text-center">{tickets}</span>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setTickets(Math.min(event.availableSeats, tickets + 1))}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{event.price} ريال / تذكرة</p>
                          <p className="text-sm text-muted-foreground">شامل الضريبة</p>
                        </div>
                      </div>
                      
                      {tickets > event.availableSeats && (
                        <Alert className="mt-4">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            عدد التذاكر المطلوبة يتجاوز المقاعد المتاحة
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Discounts & Points */}
                  <Card>
                    <CardHeader>
                      <CardTitle>الخصومات والنقاط</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Coupon Code */}
                      <div>
                        <Label htmlFor="coupon">كود الخصم</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="coupon"
                            placeholder="أدخل كود الخصم"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                          />
                          <Button onClick={applyCoupon} variant="outline">
                            تطبيق
                          </Button>
                        </div>
                        {appliedCoupon && (
                          <div className="flex items-center gap-2 mt-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">تم تطبيق كود الخصم: {appliedCoupon.code}</span>
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>استخدام النقاط</Label>
                          <p className="text-sm text-muted-foreground">
                            لديك {user.points} نقطة = {user.pointsValue} ريال
                            <br />
                            سيتم خصم تلقائياً حتى 10% (حد أقصى 20 ريال)
                          </p>
                        </div>
                        <Switch checked={usePoints} onCheckedChange={setUsePoints} />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Payment Method */}
                  <Card>
                    <CardHeader>
                      <CardTitle>طريقة الدفع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card 
                            className={`cursor-pointer border-2 ${paymentMethod === 'mada' ? 'border-primary' : 'border-border'}`}
                            onClick={() => setPaymentMethod('mada')}
                          >
                            <CardContent className="p-4 text-center">
                              <CreditCard className="w-8 h-8 mx-auto mb-2" />
                              <p className="font-semibold">مدى</p>
                            </CardContent>
                          </Card>
                          <Card 
                            className={`cursor-pointer border-2 ${paymentMethod === 'visa' ? 'border-primary' : 'border-border'}`}
                            onClick={() => setPaymentMethod('visa')}
                          >
                            <CardContent className="p-4 text-center">
                              <CreditCard className="w-8 h-8 mx-auto mb-2" />
                              <p className="font-semibold">Visa/MasterCard</p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Card 
                            className={`cursor-pointer border-2 ${paymentMethod === 'apple' ? 'border-primary' : 'border-border'}`}
                            onClick={() => setPaymentMethod('apple')}
                          >
                            <CardContent className="p-4 text-center">
                              <CreditCard className="w-8 h-8 mx-auto mb-2" />
                              <p className="font-semibold">Apple Pay</p>
                            </CardContent>
                          </Card>
                          <Card 
                            className={`cursor-pointer border-2 ${paymentMethod === 'paypal' ? 'border-primary' : 'border-border'}`}
                            onClick={() => setPaymentMethod('paypal')}
                          >
                            <CardContent className="p-4 text-center">
                              <CreditCard className="w-8 h-8 mx-auto mb-2" />
                              <p className="font-semibold">PayPal</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Notice */}
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      جميع المعاملات مؤمنة ومشفرة. لن نحتفظ ببيانات بطاقتك الائتمانية.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>السعر ({tickets} تذكرة)</span>
                    <span>{subtotal} ريال</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>خصم الكوبون ({appliedCoupon.code})</span>
                      <span>-{couponDiscount} ريال</span>
                    </div>
                  )}
                  
                  {usePoints && pointsDiscount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>خصم النقاط</span>
                      <span>-{pointsDiscount} ريال</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{(subtotal - couponDiscount - pointsDiscount).toFixed(2)} ريال</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>ضريبة القيمة المضافة (15%)</span>
                    <span>{vat.toFixed(2)} ريال</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي</span>
                    <span>{total.toFixed(2)} ريال</span>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    {step === 1 && (
                      <Button 
                        className="w-full" 
                        onClick={proceedToPayment}
                        disabled={tickets > event.availableSeats}
                      >
                        المتابعة للدفع
                      </Button>
                    )}
                    
                    {step === 2 && (
                      <Button 
                        className="w-full" 
                        onClick={processPayment}
                        disabled={!paymentMethod || isProcessing}
                      >
                        {isProcessing ? 'جاري المعالجة...' : `ادفع ${total.toFixed(2)} ريال`}
                      </Button>
                    )}
                    
                    <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
                      العودة
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground text-center mt-4">
                    <p>• ستحصل على النقاط بعد حضور الفعالية</p>
                    <p>• يمكنك إلغاء الحجز حسب سياسة الإلغاء</p>
                    <p>• ستتم إضافتك لقروب الفعالية تلقائياً</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Checkout;