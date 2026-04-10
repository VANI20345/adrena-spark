import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MaintenanceCheck = ({ children }: { children: React.ReactNode }) => {
  const { userRole, loading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checking, setChecking] = useState(true);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    checkMaintenanceMode();
    
    // Subscribe to changes in maintenance mode
    const channel = supabase
      .channel('maintenance-mode-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.maintenance_mode'
        },
        (payload) => {
          const newValue = payload.new.value as { enabled: boolean };
          setMaintenanceMode(newValue?.enabled || false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (data?.value && typeof data.value === 'object' && 'enabled' in data.value) {
        setMaintenanceMode((data.value as { enabled: boolean }).enabled);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleDisableMaintenance = async () => {
    setDisabling(true);
    try {
      await supabase
        .from('system_settings')
        .update({ value: { enabled: false } })
        .eq('key', 'maintenance_mode');
      setMaintenanceMode(false);
    } catch (error) {
      console.error('Error disabling maintenance:', error);
    } finally {
      setDisabling(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admins can ALWAYS access the site and disable maintenance mode
  if (userRole === 'super_admin') {
    if (maintenanceMode) {
      // Show a banner at the top but allow full access
      return (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">وضع الصيانة مفعّل - أنت تشاهد الموقع كمسؤول</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleDisableMaintenance}
                disabled={disabling}
              >
                {disabling ? 'جاري الإيقاف...' : 'إيقاف وضع الصيانة'}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/super-admin" className="flex items-center gap-1">
                  <Settings className="w-4 h-4" />
                  لوحة التحكم
                </Link>
              </Button>
            </div>
          </div>
          <div className="pt-12">
            {children}
          </div>
        </>
      );
    }
    return <>{children}</>;
  }

  // If maintenance mode is on for admins
  if (maintenanceMode && userRole === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">وضع الصيانة مفعّل</h1>
            <p className="text-muted-foreground">
              الموقع حالياً في وضع الصيانة. تواصل مع المسؤول الأعلى لإيقافه.
            </p>
          </div>
        </div>
      </div>
    );
  }
    
  // Regular users see maintenance message
  if (maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">الموقع تحت الصيانة</h1>
            <p className="text-muted-foreground">
              نعتذر عن الإزعاج. نحن نعمل حالياً على تحسين الموقع. سنعود قريباً!
            </p>
          </div>
          <Alert>
            <AlertDescription>
              يرجى المحاولة مرة أخرى لاحقاً. شكراً لصبركم.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
