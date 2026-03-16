import React from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuperAdminLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SuperAdminLayoutWrapper - Provides unified RTL/LTR layout handling for all Super Admin pages
 * 
 * Features:
 * - Centralized dir={isRTL ? 'rtl' : 'ltr'} at container level
 * - Consistent text alignment via CSS classes
 * - Error boundary with Arabic-aware error messages
 */
export const SuperAdminLayoutWrapper: React.FC<SuperAdminLayoutWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div 
      className={`space-y-6 ${className}`} 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {children}
    </div>
  );
};

// Header wrapper with RTL-aware flex direction
interface SuperAdminHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  title,
  description,
  icon,
  actions,
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {icon}
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {actions}
        </div>
      )}
    </div>
  );
};

// Stats card wrapper with RTL alignment
interface SuperAdminStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
  bgColor?: string;
}

export const SuperAdminStatsCard: React.FC<SuperAdminStatsCardProps> = ({
  title,
  value,
  icon,
  description,
  color = 'text-primary',
  bgColor = 'bg-primary/10',
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
    </div>
  );
};

// Error state component for data loading failures
interface SuperAdminErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const SuperAdminErrorState: React.FC<SuperAdminErrorStateProps> = ({
  title,
  description,
  onRetry,
  retryLabel,
}) => {
  const { isRTL, language } = useLanguageContext();
  const defaultRetryLabel = language === 'ar' ? 'إعادة المحاولة' : 'Retry';

  return (
    <div className={`text-center py-12 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {retryLabel || defaultRetryLabel}
        </Button>
      )}
    </div>
  );
};

// Empty state component for zero records
interface SuperAdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const SuperAdminEmptyState: React.FC<SuperAdminEmptyStateProps> = ({
  icon,
  title,
  description,
}) => {
  const { isRTL } = useLanguageContext();

  return (
    <div className="text-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="h-12 w-12 mx-auto text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

// Flex row wrapper with RTL support
interface SuperAdminFlexRowProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'end' | 'between' | 'center';
  align?: 'start' | 'end' | 'center';
}

export const SuperAdminFlexRow: React.FC<SuperAdminFlexRowProps> = ({
  children,
  className = '',
  justify = 'start',
  align = 'center',
}) => {
  const { isRTL } = useLanguageContext();

  const justifyClasses = {
    start: 'justify-start',
    end: 'justify-end',
    between: 'justify-between',
    center: 'justify-center',
  };

  const alignClasses = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
  };

  return (
    <div 
      className={`flex ${justifyClasses[justify]} ${alignClasses[align]} ${isRTL ? 'flex-row-reverse' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default SuperAdminLayoutWrapper;
