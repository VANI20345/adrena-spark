import React, { Suspense } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { usePWA } from '@/hooks/usePWA';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minLoadingTime?: number;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({ 
  children, 
  fallback,
  minLoadingTime = 300
}) => {
  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      {children}
    </Suspense>
  );
};

const DefaultLoadingFallback: React.FC = () => {
  const { t } = useLanguageContext();
  const { isOnline } = usePWA();

  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          {isOnline ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-semibold">{t('loading.title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('loading.description')}
                </p>
              </div>
            </>
          ) : (
            <OfflineLoadingState />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const OfflineLoadingState: React.FC = () => {
  const { t } = useLanguageContext();

  return (
    <>
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h3 className="font-semibold">{t('offline.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('offline.description')}
        </p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => window.location.reload()}
      >
        <Wifi className="h-4 w-4 mr-2" />
        {t('offline.retry')}
      </Button>
    </>
  );
};

// Enhanced loading states for different scenarios
export const PageLoadingBoundary: React.FC<LoadingBoundaryProps> = ({ children }) => (
  <LoadingBoundary fallback={<PageLoadingFallback />}>
    {children}
  </LoadingBoundary>
);

const PageLoadingFallback: React.FC = () => {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 mx-auto">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-primary/10 animate-pulse"></div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t('loading.pageTitle')}</h2>
          <p className="text-muted-foreground">{t('loading.pageDescription')}</p>
        </div>
      </div>
    </div>
  );
};

export const ComponentLoadingBoundary: React.FC<LoadingBoundaryProps> = ({ children }) => (
  <LoadingBoundary fallback={<ComponentLoadingFallback />}>
    {children}
  </LoadingBoundary>
);

const ComponentLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

// Skeleton loading components
export const SkeletonCard: React.FC = () => (
  <Card>
    <CardContent className="p-4 space-y-3">
      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
      <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
      <div className="h-20 bg-muted animate-pulse rounded"></div>
      <div className="flex space-x-2">
        <div className="h-8 bg-muted animate-pulse rounded w-16"></div>
        <div className="h-8 bg-muted animate-pulse rounded w-20"></div>
      </div>
    </CardContent>
  </Card>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);