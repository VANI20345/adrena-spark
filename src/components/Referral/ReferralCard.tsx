import React, { useState } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Check, Users, Gift, MessageCircle } from 'lucide-react';
import { useUserReferralInfo } from '@/hooks/useGamification';
import { useToast } from '@/hooks/use-toast';
import { REFERRAL_REWARD_AMOUNT } from '@/constants/defaults';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// X (Twitter) Icon
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// WhatsApp Icon
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export const ReferralCard: React.FC = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const { data: referralInfo, isLoading } = useUserReferralInfo();
  const [copied, setCopied] = useState(false);
  
  const referralLink = referralInfo?.referral_code 
    ? `${window.location.origin}/join?ref=${referralInfo.referral_code}`
    : '';
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: isRTL ? 'تم النسخ!' : 'Copied!',
        description: isRTL ? 'تم نسخ رابط الإحالة بنجاح' : 'Referral link copied to clipboard'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'فشل نسخ الرابط' : 'Failed to copy link',
        variant: 'destructive'
      });
    }
  };

  const handleCopyCode = async () => {
    if (!referralInfo?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referralInfo.referral_code);
      setCopied(true);
      toast({
        title: isRTL ? 'تم النسخ!' : 'Copied!',
        description: isRTL ? 'تم نسخ كود الإحالة' : 'Referral code copied'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback handled
    }
  };

  const shareToWhatsApp = () => {
    const text = isRTL 
      ? `انضم إلى أدرينا واحصل على مكافآت! استخدم كود الإحالة الخاص بي: ${referralInfo?.referral_code}\n${referralLink}`
      : `Join Adrena and get rewards! Use my referral code: ${referralInfo?.referral_code}\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToX = () => {
    const text = isRTL 
      ? `انضم إلى @AdrenaApp واحصل على مكافآت! 🎁\nاستخدم كود الإحالة: ${referralInfo?.referral_code}`
      : `Join @AdrenaApp and get rewards! 🎁\nUse referral code: ${referralInfo?.referral_code}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? 'انضم إلى أدرينا!' : 'Join Adrena!',
          text: isRTL 
            ? `انضم إلى أدرينا واحصل على مكافآت! استخدم كودي: ${referralInfo?.referral_code}`
            : `Join Adrena and get rewards! Use my code: ${referralInfo?.referral_code}`,
          url: referralLink
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-40 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/20 transition-colors">
        <CardHeader className="bg-gradient-to-br from-primary/15 via-primary/10 to-transparent pb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Gift className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <div>
              <CardTitle className="text-xl">{isRTL ? 'ادعُ أصدقاءك' : 'Invite Friends'}</CardTitle>
              <CardDescription className="text-base">
                {isRTL 
                  ? `احصل على ${REFERRAL_REWARD_AMOUNT} ريال لكل صديق!`
                  : `Get ${REFERRAL_REWARD_AMOUNT} SAR per friend!`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Referral Code - Click to Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
            </label>
            <motion.button
              onClick={handleCopyCode}
              className={cn(
                "w-full p-4 rounded-xl border-2 border-dashed transition-all duration-300",
                "flex items-center justify-center gap-3 group",
                copied 
                  ? "border-green-400 bg-green-50 dark:bg-green-950/30" 
                  : "border-primary/30 hover:border-primary hover:bg-primary/5"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                {referralInfo?.referral_code || '------'}
              </span>
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-5 h-5 text-green-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <p className="text-xs text-center text-muted-foreground">
              {isRTL ? 'انقر للنسخ' : 'Click to copy'}
            </p>
          </div>
          
          {/* Social Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'شارك مع أصدقائك' : 'Share with friends'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 text-[#25D366] hover:text-[#25D366]"
                onClick={shareToWhatsApp}
              >
                <WhatsAppIcon />
                <span className="ml-2 hidden sm:inline">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 bg-foreground/5 hover:bg-foreground/10 border-foreground/20"
                onClick={shareToX}
              >
                <XIcon />
                <span className="ml-2 hidden sm:inline">X</span>
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={handleNativeShare}
              >
                <Share2 className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">{isRTL ? 'مشاركة' : 'Share'}</span>
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <motion.div 
              className="text-center p-4 rounded-xl bg-primary/5"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary">
                <Users className="w-6 h-6" />
                {referralInfo?.referral_count || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? 'إحالات ناجحة' : 'Successful Referrals'}
              </p>
            </motion.div>
            <motion.div 
              className="text-center p-4 rounded-xl bg-green-500/5"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-green-600">
                <Gift className="w-6 h-6" />
                {referralInfo?.totalEarned || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? 'ريال مكتسب' : 'SAR Earned'}
              </p>
            </motion.div>
          </div>
          
          {/* Recent Referrals */}
          {(referralInfo?.rewards?.length || 0) > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                {isRTL ? 'آخر الإحالات' : 'Recent Referrals'}
              </h4>
              <div className="space-y-2">
                {referralInfo?.rewards?.slice(0, 3).map((reward: any) => (
                  <motion.div 
                    key={reward.id} 
                    className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="text-muted-foreground">
                      {new Date(reward.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                    <Badge 
                      variant={reward.reward_status === 'credited' ? 'default' : 'secondary'}
                      className={cn(
                        reward.reward_status === 'credited' && 'bg-green-600'
                      )}
                    >
                      {reward.reward_status === 'credited' 
                        ? (isRTL ? 'مُضاف' : 'Credited')
                        : (isRTL ? 'قيد الانتظار' : 'Pending')
                      }
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};