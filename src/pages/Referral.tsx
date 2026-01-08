import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useUserReferralInfo } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Gift, Share2, Copy, CheckCircle, Users, Star, 
  Sparkles, ArrowRight, ExternalLink, QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ReferralPage = () => {
  const { language } = useLanguageContext();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const [copied, setCopied] = useState(false);

  const { data: referralInfo, isLoading } = useUserReferralInfo();

  const referralCode = referralInfo?.referral_code || '';
  const referralLink = `${window.location.origin}/join?ref=${referralCode}`;
  const referralCount = referralInfo?.referral_count || 0;
  const totalEarned = referralInfo?.totalEarned || 0;
  const rewards = referralInfo?.rewards || [];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: isRTL ? 'تم النسخ!' : 'Copied!',
        description: isRTL ? 'تم نسخ الرابط للحافظة' : 'Link copied to clipboard'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل في نسخ الرابط' : 'Failed to copy link',
        variant: 'destructive'
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? 'انضم إلى هواية!' : 'Join Hawaya!',
          text: isRTL 
            ? 'انضم إلى هواية واحصل على مكافآت مجانية!' 
            : 'Join Hawaya and get free rewards!',
          url: referralLink
        });
      } catch (error) {
        copyToClipboard(referralLink);
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  const benefits = [
    {
      icon: Gift,
      title: isRTL ? 'مكافأة 50 نقطة' : '50 Points Reward',
      description: isRTL 
        ? 'احصل على 50 نقطة عند أول حجز مدفوع لصديقك'
        : 'Get 50 points when your friend makes their first paid booking'
    },
    {
      icon: Users,
      title: isRTL ? 'شارة المؤثر' : 'Influencer Badge',
      description: isRTL 
        ? 'احصل على شارة خاصة عند دعوة 5 أصدقاء'
        : 'Earn a special badge when you invite 5 friends'
    },
    {
      icon: Star,
      title: isRTL ? 'صديقك يربح أيضاً!' : 'Your Friend Wins Too!',
      description: isRTL 
        ? 'يحصل صديقك على 25 نقطة ترحيبية'
        : 'Your friend gets 25 welcome points'
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Gift className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isRTL ? 'برنامج الإحالة' : 'Referral Program'}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {isRTL ? 'ادعُ أصدقاءك واربح!' : 'Invite Friends & Earn!'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            {isRTL 
              ? 'شارك رابط الإحالة الخاص بك واحصل على مكافآت مع كل صديق ينضم'
              : 'Share your referral link and earn rewards for every friend who joins'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'الأصدقاء المُحالون' : 'Friends Referred'}
                  </p>
                  <p className="text-3xl font-bold">{referralCount}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'النقاط المكتسبة' : 'Points Earned'}
                  </p>
                  <p className="text-3xl font-bold">{totalEarned}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Referral Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-8 overflow-hidden border-2 border-primary/20">
            <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-2">
                  {isRTL ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
                </h2>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="text-3xl font-bold font-mono tracking-[0.3em] text-primary">
                    {referralCode}
                  </span>
                </div>
              </div>

              {/* Referral Link */}
              <div className="p-4 bg-muted/50 rounded-xl mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'رابط الإحالة' : 'Referral Link'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-background rounded-lg text-sm truncate border">
                    {referralLink}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(referralLink)}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button size="lg" className="gap-2" onClick={shareLink}>
                  <Share2 className="h-5 w-5" />
                  {isRTL ? 'مشاركة الرابط' : 'Share Link'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="gap-2">
                      <QrCode className="h-5 w-5" />
                      {isRTL ? 'رمز QR' : 'QR Code'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{isRTL ? 'رمز QR للإحالة' : 'Referral QR Code'}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center p-6">
                      <div className="p-4 bg-white rounded-xl">
                        <QRCodeSVG value={referralLink} size={200} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        {isRTL 
                          ? 'امسح الرمز للانضمام عبر الإحالة'
                          : 'Scan to join via referral'}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {isRTL ? 'مزايا الإحالة' : 'Referral Benefits'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral History */}
        {rewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {isRTL ? 'سجل الإحالات' : 'Referral History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rewards.map((reward: any, index: number) => (
                    <div 
                      key={reward.id || index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {isRTL ? 'صديق مُحال' : 'Referred Friend'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reward.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={reward.reward_status === 'credited' ? 'default' : 'secondary'}>
                        {reward.reward_status === 'credited' 
                          ? (isRTL ? 'مكتسب' : 'Earned')
                          : (isRTL ? 'قيد الانتظار' : 'Pending')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-6 text-center">
                {isRTL ? 'كيف يعمل البرنامج؟' : 'How It Works'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-3">
                    1
                  </div>
                  <h4 className="font-semibold mb-1">{isRTL ? 'شارك الرابط' : 'Share Link'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'أرسل رابط الإحالة لأصدقائك' : 'Send your referral link to friends'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-3">
                    2
                  </div>
                  <h4 className="font-semibold mb-1">{isRTL ? 'ينضم صديقك' : 'Friend Joins'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'يسجل صديقك ويحجز أول فعالية' : 'Friend signs up and books first event'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-3">
                    3
                  </div>
                  <h4 className="font-semibold mb-1">{isRTL ? 'اربح المكافآت' : 'Earn Rewards'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'تحصل كلاكما على نقاط مكافأة' : 'Both of you receive bonus points'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ReferralPage;
