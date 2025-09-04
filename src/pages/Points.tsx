import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, TrendingUp, Award, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const PointsPage = () => {
  const { userRole } = useAuth();

  const currentPoints = 85;
  const nextRewardPoints = 100;
  const progressPercentage = (currentPoints / nextRewardPoints) * 100;

  const rewardHistory = [
    {
      id: 1,
      type: 'earned',
      points: 10,
      description: 'حجز فعالية "رحلة جبلية"',
      date: '2024-01-15',
      amount: 150
    },
    {
      id: 2,
      type: 'earned',
      points: 15,
      description: 'حجز فعالية "ورشة طبخ"',
      date: '2024-01-12',
      amount: 225
    },
    {
      id: 3,
      type: 'redeemed',
      points: -20,
      description: 'خصم على فعالية "نشاط رياضي"',
      date: '2024-01-10',
      discount: 30
    }
  ];

  const availableRewards = [
    {
      id: 1,
      title: 'خصم 10 ريال',
      points: 20,
      description: 'خصم على أي فعالية'
    },
    {
      id: 2,
      title: 'خصم 25 ريال',
      points: 50,
      description: 'خصم على أي فعالية'
    },
    {
      id: 3,
      title: 'خصم 50 ريال',
      points: 100,
      description: 'خصم على أي فعالية'
    },
    {
      id: 4,
      title: 'خصم 100 ريال',
      points: 200,
      description: 'خصم على أي فعالية'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">النقاط والمكافآت</h1>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-primary">{currentPoints}</span>
              <span className="text-muted-foreground">نقطة</span>
            </div>
          </div>

          {/* Points Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  نقاطك الحالية
                </CardTitle>
                <CardDescription>
                  اربح نقاط مع كل حجز واستبدلها بخصومات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">{currentPoints}</div>
                    <p className="text-muted-foreground">نقطة متاحة</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>التقدم نحو المكافأة التالية</span>
                      <span>{currentPoints}/{nextRewardPoints}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      تحتاج {nextRewardPoints - currentPoints} نقطة أخرى للمكافأة التالية
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  كيفية كسب النقاط
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">كل 150 ريال إنفاق</span>
                    <Badge variant="secondary">10 نقاط</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">تقييم الفعالية</span>
                    <Badge variant="secondary">5 نقاط</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">دعوة صديق</span>
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

          {/* Available Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                المكافآت المتاحة
              </CardTitle>
              <CardDescription>
                استبدل نقاطك بخصومات على الفعاليات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {availableRewards.map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4 space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{reward.points} نقطة</div>
                    </div>
                    <Button 
                      className="w-full" 
                      disabled={currentPoints < reward.points}
                      variant={currentPoints >= reward.points ? "default" : "secondary"}
                    >
                      {currentPoints >= reward.points ? "استبدال" : `تحتاج ${reward.points - currentPoints} نقطة`}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Points History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                سجل النقاط
              </CardTitle>
              <CardDescription>
                آخر العمليات على نقاطك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rewardHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.type === 'earned' ? (
                        <Star className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Gift className="h-4 w-4 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                        {item.amount && (
                          <p className="text-xs text-muted-foreground">
                            مبلغ الحجز: {item.amount} ريال
                          </p>
                        )}
                        {item.discount && (
                          <p className="text-xs text-muted-foreground">
                            قيمة الخصم: {item.discount} ريال
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${
                        item.type === 'earned' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.points > 0 ? '+' : ''}{item.points} نقطة
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PointsPage;