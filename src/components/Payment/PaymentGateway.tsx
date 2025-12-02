import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGatewayProps {
  amount: number;
  booking_id: string;
  description: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  booking_id,
  description,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const formatCardNumber = (value: string) => {
    return value.replace(/\s+/g, '').replace(/[^0-9]/gi, '').match(/.{1,4}/g)?.join(' ') || '';
  };

  const formatExpiry = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Validate required fields
      if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة');
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }

      // Process payment through Moyasar
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          amount,
          currency: 'SAR',
          description,
          callback_url: `${window.location.origin}/checkout-success`,
          source: {
            type: 'creditcard',
            number: cardData.number.replace(/\s/g, ''),
            cvc: cardData.cvv,
            month: cardData.expiry.split('/')[0],
            year: `20${cardData.expiry.split('/')[1]}`,
            name: cardData.name
          },
          booking_id
        }
      });

      if (error) throw error;

      if (data.status === 'paid') {
        onPaymentSuccess(data.id);
        toast({
          title: 'تم الدفع بنجاح',
          description: `تم خصم ${amount} ريال من بطاقتك`
        });
      } else if (data.status === 'failed') {
        throw new Error(data.message || 'فشل في معالجة الدفع');
      } else {
        // Payment is pending or requires additional steps
        toast({
          title: 'معالجة الدفع',
          description: 'جاري معالجة دفعتك، سيتم إشعارك بالنتيجة قريباً'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          معلومات الدفع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>رقم البطاقة</Label>
            <Input
              placeholder="1234 5678 9012 3456"
              value={cardData.number}
              onChange={(e) => setCardData(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
              maxLength={19}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>تاريخ الانتهاء</Label>
              <Input
                placeholder="MM/YY"
                value={cardData.expiry}
                onChange={(e) => setCardData(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                maxLength={5}
              />
            </div>
            <div>
              <Label>رمز الحماية</Label>
              <Input
                placeholder="123"
                value={cardData.cvv}
                onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                maxLength={4}
              />
            </div>
          </div>
          
          <div>
            <Label>اسم صاحب البطاقة</Label>
            <Input
              placeholder="الاسم كما هو مكتوب على البطاقة"
              value={cardData.name}
              onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>معاملتك محمية بتشفير 256-bit SSL</span>
        </div>

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
      </CardContent>
    </Card>
  );
};

export default PaymentGateway;