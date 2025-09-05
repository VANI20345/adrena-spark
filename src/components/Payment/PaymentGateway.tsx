import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentGatewayProps {
  amount: number;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
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

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // محاكاة معالجة الدفع
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (Math.random() > 0.1) { // 90% نجاح
        onPaymentSuccess('pay_' + Date.now());
        toast({
          title: 'تم الدفع بنجاح',
          description: `تم خصم ${amount} ريال من بطاقتك`
        });
      } else {
        throw new Error('فشل في معالجة الدفع');
      }
    } catch (error) {
      onPaymentFailure(error instanceof Error ? error.message : 'خطأ في الدفع');
      toast({
        title: 'فشل في الدفع',
        description: 'يرجى المحاولة مرة أخرى',
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
              onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
              maxLength={19}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>تاريخ الانتهاء</Label>
              <Input
                placeholder="MM/YY"
                value={cardData.expiry}
                onChange={(e) => setCardData(prev => ({ ...prev, expiry: e.target.value }))}
                maxLength={5}
              />
            </div>
            <div>
              <Label>رمز الحماية</Label>
              <Input
                placeholder="123"
                value={cardData.cvv}
                onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
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