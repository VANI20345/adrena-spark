import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SuspensionInfo {
  suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  suspended_at: string | null;
}

export const SuspensionCheck = () => {
  const { user, signOut } = useAuth();
  const [suspensionInfo, setSuspensionInfo] = useState<SuspensionInfo | null>(null);

  useEffect(() => {
    const checkSuspension = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('suspended, suspension_reason, suspended_until, suspended_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.suspended) {
        setSuspensionInfo(profile as SuspensionInfo);
      } else {
        setSuspensionInfo(null);
      }
    };

    checkSuspension();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('suspension-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newProfile = payload.new as SuspensionInfo;
          if (newProfile.suspended) {
            setSuspensionInfo(newProfile);
          } else {
            setSuspensionInfo(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (!suspensionInfo) return null;

  const isPermanent = !suspensionInfo.suspended_until;
  const expiryDate = suspensionInfo.suspended_until 
    ? new Date(suspensionInfo.suspended_until) 
    : null;

  return (
    <AlertDialog open={suspensionInfo.suspended}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">تم تعليق حسابك</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-right">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">السبب:</p>
              <p className="text-base text-foreground">{suspensionInfo.suspension_reason || 'لم يتم تحديد السبب'}</p>
            </div>

            {!isPermanent && expiryDate && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-semibold text-foreground">ينتهي التعليق في:</p>
                  <p className="text-sm text-muted-foreground">
                    {format(expiryDate, 'PPP', { locale: ar })}
                  </p>
                </div>
              </div>
            )}

            {isPermanent && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-semibold text-destructive">تعليق دائم</p>
                <p className="text-sm text-muted-foreground mt-1">
                  هذا الحساب تم تعليقه بشكل دائم
                </p>
              </div>
            )}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="font-semibold text-foreground">للاستفسار أو حل المشكلة:</p>
              <div className="space-y-2">
                <a 
                  href="tel:+966123456789" 
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>+966 12 345 6789</span>
                </a>
                <a 
                  href="mailto:support@example.com" 
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>support@example.com</span>
                </a>
              </div>
            </div>
            <div className="pt-4">
              <Button 
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
              >
                تسجيل الخروج
              </Button>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};
