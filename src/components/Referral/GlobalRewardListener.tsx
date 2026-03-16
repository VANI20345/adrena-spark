import { useState, useEffect } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import RewardClaimDialog from '@/components/Referral/RewardClaimDialog';

const GlobalRewardListener = () => {
  const { language } = useLanguageContext();
  const [showDialog, setShowDialog] = useState(false);
  const [rewardData, setRewardData] = useState<{
    rewardType: 'landing_page' | 'friend_referral';
    points?: number;
    badge?: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.ok) return;
      
      setRewardData({
        rewardType: detail.code === 'lp_redeemed' ? 'landing_page' : 'friend_referral',
        points: detail.rewards?.points,
        badge: detail.rewards?.badge,
      });
      setShowDialog(true);
    };

    window.addEventListener('referral-redeemed', handler);
    return () => window.removeEventListener('referral-redeemed', handler);
  }, []);

  if (!rewardData) return null;

  return (
    <RewardClaimDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      rewardType={rewardData.rewardType}
      points={rewardData.points}
      badge={rewardData.badge}
      isRTL={language === 'ar'}
    />
  );
};

export default GlobalRewardListener;
