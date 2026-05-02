import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export const UserWarningScreen = () => {
  const { t } = useLanguageContext();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const { data: unacknowledgedWarnings, refetch } = useQuery({
    queryKey: ['unacknowledged-warnings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_warnings')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (warningIds: string[]) => {
      const { error } = await supabase
        .from('user_warnings')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .in('id', warningIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setHasAcknowledged(true);
      refetch();
    },
  });

  if (!unacknowledgedWarnings || unacknowledgedWarnings.length === 0 || hasAcknowledged) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-destructive/95 backdrop-blur-sm flex items-center justify-center p-4 animate-pulse">
      <Card className="max-w-2xl w-full border-destructive shadow-2xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="bg-destructive text-destructive-foreground">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 animate-bounce" />
            <CardTitle className="text-2xl">{t('warnings.officialWarning')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6">
              {unacknowledgedWarnings.map((warning) => (
                <div key={warning.id} className="border-l-4 border-destructive pl-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{warning.reason}</h3>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(warning.created_at), 'PPp')}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                    {warning.content}
                  </div>
                </div>
              ))}

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-destructive">
                  {t('warnings.totalWarnings')}: {unacknowledgedWarnings.length}
                </p>
                {unacknowledgedWarnings.length >= 2 && (
                  <p className="text-sm text-destructive">
                    {t('warnings.suspensionWarning')}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="mt-6 space-y-4">
            <p className="text-center font-medium">
              {t('warnings.mustAcknowledge')}
            </p>
            <Button
              className="w-full py-6 text-lg animate-pulse hover:animate-none"
              variant="destructive"
              onClick={() => acknowledgeMutation.mutate(unacknowledgedWarnings.map(w => w.id))}
              disabled={acknowledgeMutation.isPending}
            >
              {t('warnings.iAcknowledge')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};