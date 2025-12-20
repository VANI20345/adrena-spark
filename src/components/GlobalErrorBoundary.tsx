import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { loggerService } from '@/services/logger';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with detailed context
    loggerService.error('Global Error Boundary Caught Error', {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId') || 'anonymous'
    });
    
    this.setState({
      error,
      errorInfo
    });

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const errorData = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId') || 'anonymous',
        buildVersion: process.env.REACT_APP_VERSION || 'unknown'
      };
      
      // Send to error reporting endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      loggerService.error('Error reporting failed', { reportingError });
    }
  };

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: '' 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  resetError: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorInfo, 
  errorId, 
  resetError 
}) => {
  const { t } = useLanguageContext();
  
  const copyErrorDetails = () => {
    const errorDetails = {
      errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  const reportBug = () => {
    const subject = encodeURIComponent(`خطأ في التطبيق - ${errorId}`);
    const body = encodeURIComponent(`
تفاصيل الخطأ:
- معرف الخطأ: ${errorId}
- الرسالة: ${error.message}
- الوقت: ${new Date().toLocaleString('ar-SA')}
- الصفحة: ${window.location.href}

يرجى وصف ما كنت تفعله عند حدوث هذا الخطأ:
[اكتب هنا...]
    `);
    
    window.open(`mailto:support@hawaya.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t('errors.unexpected')}</CardTitle>
          <CardDescription className="text-base">
            {t('errors.unexpectedDescription')}
          </CardDescription>
          <div className="text-sm text-muted-foreground mt-2">
            {t('errors.errorId')}: {errorId}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Details in Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                {t('errors.developmentDetails')}
              </h4>
              <div className="space-y-2">
                <div className="text-xs">
                  <strong>خطأ:</strong> {error.message}
                </div>
                {error.stack && (
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-32 bg-background p-2 rounded">
                    {error.stack}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-32 bg-background p-2 rounded">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* User Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('errors.retry')}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'} 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('errors.backToHome')}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={copyErrorDetails}
              className="w-full"
            >
              {t('errors.copyDetails')}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={reportBug}
              className="w-full"
            >
              <Bug className="w-4 h-4 mr-2" />
              {t('errors.reportBug')}
            </Button>
          </div>

          {/* Help Information */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>{t('errors.persistentError')}</p>
            <div className="flex flex-col gap-1">
              <span>📧 support@hawaya.com</span>
              <span>📱 واتساب: +966 50 123 4567</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalErrorBoundary;