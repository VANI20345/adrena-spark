import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, UserPlus, Loader2, CheckCircle, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const JoinReferral = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [referrer, setReferrer] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  
  const refCode = searchParams.get('ref');
  const isRTL = language === 'ar';

  useEffect(() => {
    if (refCode) {
      validateReferralCode();
      localStorage.setItem('pending_referral_code', refCode.toUpperCase());
    } else {
      setIsLoading(false);
      setIsInvalid(true);
    }
  }, [refCode]);

  const validateReferralCode = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('referral_code', refCode!.toUpperCase())
        .single();

      if (error || !data) {
        setIsInvalid(true);
        setIsLoading(false);
        return;
      }

      setReferrer(data);
    } catch (error) {
      console.error('Error validating referral:', error);
      setIsInvalid(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!user || !refCode) return;

    setIsProcessing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('user_id', user.id)
        .single();

      if (profile?.referred_by) {
        toast({
          title: isRTL ? 'تم استخدام إحالة مسبقاً' : 'Already Referred',
          description: isRTL ? 'لقد تم استخدام كود إحالة مسبقاً لحسابك' : 'Your account already has a referral applied',
          variant: 'destructive'
        });
        return;
      }

      const { data: referrerData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', refCode.toUpperCase())
        .single();

      if (!referrerData || referrerData.user_id === user.id) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'لا يمكنك استخدام كود الإحالة الخاص بك' : 'You cannot use your own referral code',
          variant: 'destructive'
        });
        return;
      }

      await supabase
        .from('profiles')
        .update({ referred_by: referrerData.user_id })
        .eq('user_id', user.id);

      await supabase
        .from('referral_rewards')
        .insert({
          referrer_id: referrerData.user_id,
          referred_id: user.id,
          reward_status: 'pending'
        });

      setIsApplied(true);
      localStorage.removeItem('pending_referral_code');

      toast({
        title: isRTL ? 'تم بنجاح!' : 'Success!',
        description: isRTL 
          ? 'تم ربط حسابك. ستحصل المُحيل على المكافأة عند أول حجز مدفوع لك'
          : 'Your account is linked. The referrer will receive their reward after your first paid booking'
      });

      setTimeout(() => navigate('/'), 2500);
    } catch (error) {
      console.error('Error applying referral:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء تطبيق الإحالة' : 'An error occurred while applying the referral',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Navbar />
        <div className="flex justify-center items-center py-32">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-12 w-12 text-primary" />
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Invalid or expired code
  if (isInvalid || isExpired || !refCode || !referrer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/10">
        <Navbar />
        <main className="container mx-auto px-4 py-16 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-2 border-destructive/20 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-destructive/50 to-destructive" />
              <CardContent className="pt-12 pb-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6"
                >
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </motion.div>
                
                <h1 className="text-2xl font-bold mb-3">
                  {isExpired 
                    ? (isRTL ? 'انتهت صلاحية الكود' : 'Code Expired')
                    : (isRTL ? 'كود إحالة غير صالح' : 'Invalid Referral Code')
                  }
                </h1>
                <p className="text-muted-foreground mb-8">
                  {isExpired
                    ? (isRTL ? 'انتهت صلاحية كود الإحالة هذا' : 'This referral code has expired')
                    : (isRTL ? 'كود الإحالة غير موجود أو غير صالح' : 'The referral code is not valid or does not exist')
                  }
                </p>
                
                <Button size="lg" onClick={() => navigate('/')} className="gap-2">
                  {isRTL ? 'العودة للرئيسية' : 'Go Home'}
                  <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-primary/20 overflow-hidden shadow-xl shadow-primary/5">
            {/* Gradient top bar */}
            <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            
            {/* Animated confetti background for success */}
            <AnimatePresence>
              {isApplied && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                >
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][i % 4],
                        left: `${Math.random() * 100}%`,
                        top: -10
                      }}
                      animate={{
                        y: [0, 400],
                        x: [0, (Math.random() - 0.5) * 100],
                        rotate: [0, 360],
                        opacity: [1, 0]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.1,
                        ease: 'easeOut'
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            <CardContent className="pt-10 pb-8 text-center relative">
              {/* Gift Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30"
              >
                <Gift className="h-12 w-12 text-primary-foreground" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              </motion.div>
              
              <motion.h1 
                className="text-3xl font-bold mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {isRTL ? 'دعوة للانضمام!' : "You've Been Invited!"}
              </motion.h1>
              
              {/* Referrer info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-3 mb-6"
              >
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={referrer.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {referrer.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-muted-foreground">
                  {isRTL 
                    ? `${referrer.full_name || 'صديق'} يدعوك للانضمام`
                    : `${referrer.full_name || 'A friend'} invited you to join`}
                </p>
              </motion.div>

              {/* Referral Code Display */}
              <motion.div 
                className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl mb-8 border border-primary/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-muted-foreground mb-2">
                  {isRTL ? 'كود الإحالة' : 'Referral Code'}
                </p>
                <p className="text-4xl font-bold font-mono tracking-[0.4em] text-primary">
                  {refCode.toUpperCase()}
                </p>
              </motion.div>

              {/* Action Button */}
              <AnimatePresence mode="wait">
                {isApplied ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <span className="text-lg font-medium text-green-600">
                      {isRTL ? 'تم تطبيق الإحالة بنجاح!' : 'Referral Applied Successfully!'}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? 'جاري التحويل...' : 'Redirecting...'}
                    </p>
                  </motion.div>
                ) : user ? (
                  <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg gap-3 shadow-lg shadow-primary/20"
                      onClick={handleApplyReferral}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      {isRTL ? 'تطبيق كود الإحالة' : 'Apply Referral Code'}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="signup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg gap-3 shadow-lg shadow-primary/20"
                      onClick={() => navigate('/auth')}
                    >
                      <UserPlus className="h-5 w-5" />
                      {isRTL ? 'إنشاء حساب جديد' : 'Create an Account'}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      {isRTL 
                        ? 'سيتم تطبيق كود الإحالة تلقائياً عند التسجيل'
                        : 'The referral code will be applied automatically after signup'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default JoinReferral;