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
  const { t, language } = useLanguageContext();
  
  // Check if user is admin from localStorage (since we can't use hooks for auth in error boundary)
  const isAdmin = React.useMemo(() => {
    try {
      const userRole = localStorage.getItem('userRole');
      return userRole === 'admin';
    } catch {
      return false;
    }
  }, []);

  // Check if in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Only show technical details to admins or in development
  const showTechnicalDetails = isDevelopment || isAdmin;
  
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
          <CardTitle className="text-2xl">
            {language === 'ar' ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-base">
            {language === 'ar' 
              ? 'نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.'
              : 'We apologize for this error. Please try again or return to the home page.'}
          </CardDescription>
          {showTechnicalDetails && (
            <div className="text-sm text-muted-foreground mt-2">
              {language === 'ar' ? 'معرف الخطأ' : 'Error ID'}: {errorId}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Details - Only for admins or development */}
          {showTechnicalDetails && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                {language === 'ar' ? 'تفاصيل تقنية (للمطورين)' : 'Technical Details (for developers)'}
              </h4>
              <div className="space-y-2">
                <div className="text-xs">
                  <strong>{language === 'ar' ? 'خطأ' : 'Error'}:</strong> {error.message}
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
              {language === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'} 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
            
            {showTechnicalDetails && (
              <Button 
                variant="outline" 
                onClick={copyErrorDetails}
                className="w-full"
              >
                {language === 'ar' ? 'نسخ التفاصيل' : 'Copy Details'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={reportBug}
              className="w-full"
            >
              <Bug className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report Issue'}
            </Button>
          </div>

          {/* Help Information */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              {language === 'ar' 
                ? 'إذا استمرت المشكلة، يرجى التواصل معنا'
                : 'If the problem persists, please contact us'}
            </p>
            <div className="flex flex-col gap-1">
              <span>📧 support@hawaya.com</span>
              <span>📱 {language === 'ar' ? 'واتساب' : 'WhatsApp'}: +966 50 123 4567</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalErrorBoundary;