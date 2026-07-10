import { ReactNode } from 'react';
import { useFeatureEnabled, FeatureKey } from '@/hooks/useFeatureToggles';
import { useAuth } from '@/contexts/AuthContext';
import FeatureDisabled from './FeatureDisabled';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
}

const FeatureGate = ({ feature, children }: FeatureGateProps) => {
  const { enabled, isLoading } = useFeatureEnabled(feature);
  const { userRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admins and admins can always access for management/diagnostics
  if (!enabled && userRole !== 'super_admin' && userRole !== 'admin') {
    return <FeatureDisabled featureKey={feature} />;
  }

  return <>{children}</>;
};

export default FeatureGate;