import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Gift, Calculator, Sparkles } from 'lucide-react';

interface LoyaltyCalculatorProps {
  currentPoints: number;
  totalSpent: number;
  onRedeemPoints: (points: number, reward: any) => void;
}

export const LoyaltyCalculator = ({ 
  currentPoints = 0, 
  totalSpent = 0,
  onRedeemPoints 
}: LoyaltyCalculatorProps) => {
  
  // Calculate points from spending (150 SAR = 10 points)
  const pointsFromSpending = Math.floor(totalSpent / 150) * 10;
  
  const calculatePointsForAmount = (amount: number) => {
    return Math.floor(amount / 150) * 10;
  };

  const rewardTiers = [
    { points: 20, discount: 10, maxDiscount: 10, title: 'خصم 10 ريال' },
    { points: 50, discount: 25, maxDiscount: 25, title: 'خصم 25 ريال' },
    { points: 100, discount: 50, maxDiscount: 50, title: 'خصم 50 ريال' },
    { points: 200, discount: 100, maxDiscount: 100, title: 'خصم 100 ريال' },
  ];

  const getMaxDiscount = (orderAmount: number) => {
    const tenPercent = Math.floor(orderAmount * 0.1);
    return Math.min(tenPercent, 20); // Max 20 SAR discount
  };

  const getAvailableRewards = () => {
    return rewardTiers.filter(tier => currentPoints >= tier.points);
  };

  const nextTier = rewardTiers.find(tier => currentPoints < tier.points);
  const progressToNext = nextTier ? (currentPoints / nextTier.points) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            حاسبة نقاط الولاء
          </CardTitle>
          <CardDescription>
            احسب نقاطك واكتشف المكافآت المتاحة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">النقاط الحالية</span>
                <Badge variant="secondary">{currentPoints} نقطة</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">إجمالي الإنفاق</span>
                <span className="text-sm font-medium">{totalSpent} ريال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">نقاط من الإنفاق</span>
                <span className="text-sm font-medium">{pointsFromSpending} نقطة</span>
              </div>
            </div>

            {nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>التقدم للمكافأة التالية</span>
                  <span>{currentPoints}/{nextTier.points}</span>
                </div>
                <Progress value={progressToNext} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  تحتاج {nextTier.points - currentPoints} نقطة أخرى لـ {nextTier.title}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spending Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            حاسبة النقاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[150, 300, 500, 1000].map((amount) => (
              <div key={amount} className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium">{amount} ريال</span>
                <Badge variant="outline">
                  {calculatePointsForAmount(amount)} نقطة
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      {getAvailableRewards().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              المكافآت المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {getAvailableRewards().map((reward) => (
                <div key={reward.points} className="border rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <h3 className="font-semibold">{reward.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      خصم يصل إلى {reward.maxDiscount} ريال
                    </p>
                  </div>
                  <div className="text-center">
                    <Badge variant="default">{reward.points} نقطة</Badge>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => onRedeemPoints(reward.points, reward)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    استبدال الآن
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How to Earn More */}
      <Card>
        <CardHeader>
          <CardTitle>كيفية كسب المزيد من النقاط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">كل 150 ريال إنفاق</span>
              <Badge variant="secondary">10 نقاط</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">تقييم الفعالية بعد الحضور</span>
              <Badge variant="secondary">5 نقاط</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">دعوة صديق (عند أول حجز له)</span>
              <Badge variant="secondary">25 نقطة</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">إكمال الملف الشخصي</span>
              <Badge variant="secondary">15 نقطة</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};