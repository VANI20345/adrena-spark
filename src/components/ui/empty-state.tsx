import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  showRetry?: boolean;
  onRetry?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = AlertCircle,
  actionLabel,
  onAction,
  showRetry = false,
  onRetry
}) => {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {showRetry && onRetry && (
            <Button variant="outline" onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </Button>
          )}
          
          {actionLabel && onAction && (
            <Button onClick={onAction} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface LoadingStateProps {
  title?: string;
  description?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "جاري التحميل...",
  description = "يرجى الانتظار بينما نقوم بتحميل البيانات"
}) => {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          {title}
        </h3>
        
        <p className="text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "حدث خطأ",
  description = "عذراً، حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.",
  onRetry
}) => {
  return (
    <Card className="w-full border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
          {description}
        </p>
        
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        )}
      </CardContent>
    </Card>
  );
};