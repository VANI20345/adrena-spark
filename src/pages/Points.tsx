import React, { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, TrendingUp, Award, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';

const PointsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch user's loyalty points from database
  const { data: loyaltyEntries = [], isLoading } = useSupabaseQuery({
    queryKey: ['loyalty_points', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('loyalty_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }, [user?.id]),
    enabled: !!user?.id
  });

  const currentPoints = (loyaltyEntries || []).reduce((sum, entry) => {
    return entry.points > 0 ? sum + entry.points : sum;
  }, 0);
  const nextRewardPoints = 100;
  const progressPercentage = Math.min((currentPoints / nextRewardPoints) * 100, 100);

  // Available rewards based on current points
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

  const redeemPoints = async (rewardPoints: number, rewardTitle: string) => {
    if (!user?.id) return;
    
    if (currentPoints < rewardPoints) {
      toast({
        title: "نقاط غير كافية",
        description: `تحتاج ${rewardPoints - currentPoints} نقطة إضافية`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a loyalty ledger entry for points redemption
      const { error } = await supabase
        .from('loyalty_ledger')
        .insert({
          user_id: user.id,
          points: -rewardPoints,
          type: 'redemption',
          description: `استبدال نقاط: ${rewardTitle}`,
          reference_type: 'reward'
        });

      if (error) throw error;
      
      toast({
        title: "تم الاستبدال بنجاح!",
        description: `تم استبدال ${rewardPoints} نقطة مقابل ${rewardTitle}`
      });
    } catch (error) {
      console.error('Error redeeming points:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء استبدال النقاط",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
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
                      {currentPoints >= nextRewardPoints 
                        ? "مبروك! وصلت للمكافأة التالية" 
                        : `تحتاج ${nextRewardPoints - currentPoints} نقطة أخرى للمكافأة التالية`
                      }
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
                    <span className="text-sm">كل 15 ريال إنفاق</span>
                    <Badge variant="secondary">1 نقطة</Badge>
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
                      onClick={() => redeemPoints(reward.points, reward.title)}
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
                {loyaltyEntries.length === 0 ? (
                  <EmptyState 
                    icon={Star}
                    title="لا توجد عمليات نقاط"
                    description="ستظهر هنا عمليات كسب واستبدال النقاط"
                  />
                ) : (
                  loyaltyEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {entry.points > 0 ? (
                          <Star className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Gift className="h-4 w-4 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString('ar-SA')}
                          </p>
                          {entry.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              ينتهي: {new Date(entry.expires_at).toLocaleDateString('ar-SA')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${
                          entry.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.points > 0 ? '+' : ''}{entry.points} نقطة
                        </span>
                      </div>
                    </div>
                  ))
                )}
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