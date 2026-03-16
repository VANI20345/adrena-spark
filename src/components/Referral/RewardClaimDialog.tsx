import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RewardClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardType: 'landing_page' | 'friend_referral';
  points?: number;
  badge?: string;
  referrerName?: string;
  isRTL?: boolean;
}

const RewardClaimDialog = ({
  open,
  onOpenChange,
  rewardType,
  points = 1000,
  badge = 'Beta Shield',
  referrerName,
  isRTL = false,
}: RewardClaimDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/30 overflow-hidden p-0">
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-primary via-yellow-400 to-primary" />

        <div className="relative px-6 pt-8 pb-6 text-center">
          {/* Confetti particles */}
          <AnimatePresence>
            {open && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: [
                        'hsl(var(--primary))',
                        'hsl(45 90% 55%)',
                        'hsl(280 70% 55%)',
                        'hsl(150 60% 50%)',
                      ][i % 4],
                      left: `${10 + Math.random() * 80}%`,
                      top: -8,
                    }}
                    animate={{
                      y: [0, 350],
                      x: [0, (Math.random() - 0.5) * 80],
                      rotate: [0, 360],
                      opacity: [1, 0],
                    }}
                    transition={{
                      duration: 2.2,
                      delay: i * 0.08,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.15 }}
            className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-primary/30 relative"
          >
            {rewardType === 'landing_page' ? (
              <Shield className="h-10 w-10 text-primary-foreground" />
            ) : (
              <CheckCircle className="h-10 w-10 text-primary-foreground" />
            )}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-2xl font-bold mb-2"
          >
            {rewardType === 'landing_page'
              ? isRTL
                ? '🎉 تم استرداد المكافأة!'
                : '🎉 Reward Claimed!'
              : isRTL
                ? '🎉 تم تطبيق الإحالة!'
                : '🎉 Referral Applied!'}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-muted-foreground mb-5"
          >
            {rewardType === 'landing_page'
              ? isRTL
                ? 'تهانينا! تم إضافة المكافآت إلى حسابك'
                : 'Congratulations! Your rewards have been added to your account'
              : isRTL
                ? `تم ربط حسابك بدعوة ${referrerName || 'صديقك'}`
                : `Your account is linked to ${referrerName || 'your friend'}'s referral`}
          </motion.p>

          {/* Rewards display (LP only) */}
          {rewardType === 'landing_page' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3 justify-center mb-6"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold text-primary">
                  {points} {isRTL ? 'نقطة' : 'Points'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-bold text-primary">{badge}</span>
              </div>
            </motion.div>
          )}

          {/* Friend referral info */}
          {rewardType === 'friend_referral' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="px-4 py-3 bg-primary/10 rounded-xl border border-primary/20 mb-6 text-sm text-muted-foreground"
            >
              {isRTL
                ? 'سيحصل المُحيل على المكافأة عند أول حجز مدفوع لك'
                : 'The referrer will receive their reward after your first paid booking'}
            </motion.div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {isRTL ? 'رائع!' : 'Awesome!'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RewardClaimDialog;
