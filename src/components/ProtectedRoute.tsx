import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requireAuth = true 
}) => {
  const { user, userRole, loading, profile } = useAuth();
  const { t, isRTL } = useLanguageContext();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if authentication is required - show login message instead of redirect
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{t('auth.loginRequired')}</h2>
          <p className="text-muted-foreground">{t('auth.loginRequiredMessage')}</p>
          <Button 
            onClick={() => navigate('/auth', { state: { from: location } })}
            className="w-full"
          >
            {t('auth.signIn')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is suspended - block all routes
  if (user && profile?.suspended) {
    // The SuspensionCheck component will show the dialog
    // Just block access to any protected route
    return null;
  }

  // Check if provider account is pending verification
  if (user && userRole === 'provider' && (profile as any)?.verification_status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold">{t('auth.accountPendingReview')}</h2>
          <p className="text-muted-foreground">
            {t('auth.accountPendingReviewMessage')}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }

  // Check if provider account is rejected
  if (user && userRole === 'provider' && (profile as any)?.verification_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold">{t('auth.accountRejected')}</h2>
          <p className="text-muted-foreground">
            {t('auth.accountRejectedMessage')}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/contact'}
            className="w-full"
          >
            {t('auth.contactUs')}
          </Button>
        </div>
      </div>
    );
  }

  // Block providers from accessing groups
  if (user && userRole === 'provider' && location.pathname.startsWith('/groups')) {
    return <Navigate to="/" replace />;
  }

  // Allow anonymous users to discover-groups and individual group pages (for preview)
  if (!user && location.pathname.startsWith('/groups')) {
    const allowedPaths = ['/groups/discover-groups'];
    const isGroupDetail = /^\/groups\/[a-f0-9-]+$/i.test(location.pathname);
    if (!allowedPaths.includes(location.pathname) && !isGroupDetail) {
      return <Navigate to="/groups/discover-groups" replace />;
    }
  }

  // Check role requirements
  if (requiredRole && userRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
