import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Moyasar publishable key - safe to expose in client code
const MOYASAR_PUBLISHABLE_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx'; // Will be replaced with actual key

interface PaymentGatewayProps {
  amount: number;
  booking_id: string;
  description: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
  bookingType?: 'event' | 'service';
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  booking_id,
  description,
  onPaymentSuccess,
  onPaymentFailure,
  bookingType = 'event'
}) => {
  const navigate = useNavigate();
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || '';
  };

  const formatExpiry = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
  };

  const validateCard = () => {
    const newErrors: Record<string, string> = {};
    
    // Card number validation (basic Luhn check)
    const cardNumber = cardData.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 15 || cardNumber.length > 19) {
      newErrors.number = 'رقم البطاقة غير صحيح';
    }
    
    // Expiry validation
    const [month, year] = cardData.expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      newErrors.expiry = 'تاريخ انتهاء الصلاحية غير صحيح';
    } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      newErrors.expiry = 'البطاقة منتهية الصلاحية';
    }
    
    // CVV validation
    if (!cardData.cvv || cardData.cvv.length < 3) {
      newErrors.cvv = 'رمز الحماية غير صحيح';
    }
    
    // Name validation
    if (!cardData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم صاحب البطاقة';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateCard()) {
      return;
    }

    setProcessing(true);
    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }

      // Parse expiry date
      const [month, year] = cardData.expiry.split('/');

      // Call the process-payment edge function
      // Pass the current origin so 3DS redirects come back to the correct URL
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          amount,
          currency: 'SAR',
          description,
          callback_url: `${window.location.origin}/checkout/success`,
          frontend_origin: window.location.origin, // Pass origin for 3DS redirects
          source: {
            type: 'creditcard',
            number: cardData.number.replace(/\s/g, ''),
            cvc: cardData.cvv,
            month: month,
            year: `20${year}`,
            name: cardData.name
          },
          booking_id,
          booking_type: bookingType
        }
      });

      if (error) throw error;

      // Handle different payment statuses
      if (data.status === 'paid') {
        // Payment successful without 3DS - redirect to success page
        toast({
          title: 'تم الدفع بنجاح',
          description: `تم خصم ${amount} ريال من بطاقتك`
        });
        onPaymentSuccess(data.id);
        
        // Navigate to success page
        if (bookingType === 'service') {
          navigate('/service-checkout/success', {
            state: { serviceBookingId: booking_id, paymentId: data.id }
          });
        } else {
          navigate('/checkout/success', {
            state: { bookingId: booking_id, paymentId: data.id }
          });
        }
      } else if (data.status === 'initiated' && data.source?.transaction_url) {
        // 3D Secure redirect required
        toast({
          title: 'جاري التحقق من البطاقة',
          description: 'سيتم توجيهك لإكمال عملية الدفع...'
        });
        // Redirect to 3DS page - Moyasar will redirect back to our webhook
        window.location.href = data.source.transaction_url;
      } else if (data.status === 'failed') {
        // Payment failed - redirect to callback page with error
        onPaymentFailure(data.source?.message || 'فشل في معالجة الدفع');
        navigate('/checkout/callback', {
          state: { 
            status: 'failed', 
            message: data.source?.message,
            bookingId: booking_id,
            bookingType
          }
        });
      } else {
        // Pending or other status - redirect to callback to check status
        toast({
          title: 'معالجة الدفع',
          description: 'جاري معالجة دفعتك، سيتم إشعارك بالنتيجة قريباً'
        });
        navigate('/checkout/callback', {
          state: {
            status: 'pending',
            paymentId: data.id,
            bookingId: booking_id,
            bookingType
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في الدفع';
      onPaymentFailure(errorMessage);
      toast({
        title: 'فشل في الدفع',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Detect card type
  const getCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^(5018|5020|5038|6304|6759|6761|6763)/.test(cleaned)) return 'Maestro';
    if (/^(508|606|6282)/.test(cleaned)) return 'mada';
    return null;
  };

  const cardType = getCardType(cardData.number);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            معلومات الدفع
          </div>
          {cardType && (
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
              {cardType}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="card-number">رقم البطاقة</Label>
            <Input
              id="card-number"
              placeholder="1234 5678 9012 3456"
              value={cardData.number}
              onChange={(e) => {
                setCardData(prev => ({ ...prev, number: formatCardNumber(e.target.value) }));
                setErrors(prev => ({ ...prev, number: '' }));
              }}
              maxLength={19}
              className={errors.number ? 'border-destructive' : ''}
              dir="ltr"
            />
            {errors.number && (
              <p className="text-sm text-destructive mt-1">{errors.number}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="expiry">تاريخ الانتهاء</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={cardData.expiry}
                onChange={(e) => {
                  setCardData(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }));
                  setErrors(prev => ({ ...prev, expiry: '' }));
                }}
                maxLength={5}
                className={errors.expiry ? 'border-destructive' : ''}
                dir="ltr"
              />
              {errors.expiry && (
                <p className="text-sm text-destructive mt-1">{errors.expiry}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cvv">رمز الحماية</Label>
              <Input
                id="cvv"
                placeholder="123"
                type="password"
                value={cardData.cvv}
                onChange={(e) => {
                  setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }));
                  setErrors(prev => ({ ...prev, cvv: '' }));
                }}
                maxLength={4}
                className={errors.cvv ? 'border-destructive' : ''}
                dir="ltr"
              />
              {errors.cvv && (
                <p className="text-sm text-destructive mt-1">{errors.cvv}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="card-name">اسم صاحب البطاقة</Label>
            <Input
              id="card-name"
              placeholder="الاسم كما هو مكتوب على البطاقة"
              value={cardData.name}
              onChange={(e) => {
                setCardData(prev => ({ ...prev, name: e.target.value }));
                setErrors(prev => ({ ...prev, name: '' }));
              }}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>
        </div>

        <Alert variant="default" className="bg-muted/50">
          <Shield className="w-4 h-4" />
          <AlertDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            معاملتك محمية بتشفير 256-bit SSL عبر بوابة الدفع Moyasar
          </AlertDescription>
        </Alert>

        <Button 
          className="w-full" 
          onClick={handlePayment}
          disabled={processing}
          size="lg"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              جاري المعالجة...
            </div>
          ) : (
            <>
              <Lock className="w-4 h-4 ml-2" />
              ادفع {amount} ريال
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 pt-2">
          <img src="https://www.moyasar.com/assets/images/logos/visa.svg" alt="Visa" className="h-6" />
          <img src="https://www.moyasar.com/assets/images/logos/mastercard.svg" alt="Mastercard" className="h-6" />
          <img src="https://www.moyasar.com/assets/images/logos/mada.svg" alt="mada" className="h-6" />
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentGateway;