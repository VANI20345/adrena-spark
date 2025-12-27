import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const MaintenanceCheck = ({ children }: { children: React.ReactNode }) => {
  const { userRole, loading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checking, setChecking] = useState(true);

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

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If maintenance mode is on
  if (maintenanceMode) {
    // Admin sees only disable button
    if (userRole === 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">وضع الصيانة مفعّل</h1>
              <p className="text-muted-foreground">
                الموقع حالياً في وضع الصيانة. المستخدمون العاديون لا يمكنهم الوصول.
              </p>
            </div>
            <Button 
              onClick={async () => {
                try {
                  await supabase
                    .from('system_settings')
                    .update({ value: { enabled: false } })
                    .eq('key', 'maintenance_mode');
                  setMaintenanceMode(false);
                } catch (error) {
                  console.error('Error disabling maintenance:', error);
                }
              }}
              className="w-full"
            >
              إيقاف وضع الصيانة
            </Button>
          </div>
        </div>
      );
    }
    
    // Regular users see maintenance message
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
