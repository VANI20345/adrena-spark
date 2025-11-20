import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, XCircle } from 'lucide-react';

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
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold">حسابك قيد المراجعة</h2>
          <p className="text-muted-foreground">
            شكراً لتسجيلك كمقدم خدمة. حسابك قيد المراجعة من قبل فريق الإدارة.
            سيتم إشعارك عبر البريد الإلكتروني فور الموافقة على حسابك.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  // Check if provider account is rejected
  if (user && userRole === 'provider' && (profile as any)?.verification_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold">تم رفض طلب التحقق</h2>
          <p className="text-muted-foreground">
            نأسف لإبلاغك بأنه تم رفض طلب التحقق من حسابك كمقدم خدمة.
            يرجى التواصل مع الدعم الفني للمزيد من المعلومات.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/contact'}
            className="w-full"
          >
            تواصل معنا
          </Button>
        </div>
      </div>
    );
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