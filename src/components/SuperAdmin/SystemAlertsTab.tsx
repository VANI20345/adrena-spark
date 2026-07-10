import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle, CheckCircle2, Bell, Info, AlertCircle, Eye, RefreshCw, Loader2,
} from 'lucide-react';

type Severity = 'info' | 'warning' | 'error' | 'critical';

interface Alert {
  id: string;
  severity: Severity;
  component: string;
  message: string;
  context: any;
  reference_type: string | null;
  reference_id: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const severityMeta: Record<Severity, { color: string; icon: React.ComponentType<any>; bg: string }> = {
  critical: { color: 'bg-red-600 text-white', icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' },
  error:    { color: 'bg-red-500 text-white', icon: AlertCircle, bg: 'bg-red-50/50 dark:bg-red-950/10 border-red-200/70 dark:border-red-900/70' },
  warning:  { color: 'bg-yellow-500 text-white', icon: AlertTriangle, bg: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900' },
  info:     { color: 'bg-blue-500 text-white', icon: Info, bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' },
};

export const SystemAlertsTab: React.FC = () => {
  const { language } = useLanguageContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isRTL = language === 'ar';

  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<'unack' | 'ack' | 'all'>('unack');
  const [selected, setSelected] = useState<Alert | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['system_alerts', severity, status],
    queryFn: async () => {
      let q = supabase.from('system_alerts').select('*').order('created_at', { ascending: false }).limit(200);
      if (severity !== 'all') q = q.eq('severity', severity);
      if (status === 'unack') q = q.eq('acknowledged', false);
      if (status === 'ack') q = q.eq('acknowledged', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Alert[];
    },
    refetchInterval: 30000,
  });

  const counts = React.useMemo(() => {
    const c = { critical: 0, error: 0, warning: 0, info: 0, unack: 0 };
    alerts.forEach(a => {
      c[a.severity]++;
      if (!a.acknowledged) c.unack++;
    });
    return c;
  }, [alerts]);

  const ackOne = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from('system_alerts').update({
      acknowledged: true,
      acknowledged_by: user?.id,
      acknowledged_at: new Date().toISOString(),
    }).eq('id', id);
    setBusy(null);
    if (error) {
      toast({ title: isRTL ? 'فشل التأكيد' : 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: isRTL ? 'تم تأكيد التنبيه' : 'Alert acknowledged' });
    qc.invalidateQueries({ queryKey: ['system_alerts'] });
  };

  const ackAll = async () => {
    const ids = alerts.filter(a => !a.acknowledged).map(a => a.id);
    if (ids.length === 0) return;
    setBusy('all');
    const { error } = await supabase.from('system_alerts').update({
      acknowledged: true,
      acknowledged_by: user?.id,
      acknowledged_at: new Date().toISOString(),
    }).in('id', ids);
    setBusy(null);
    if (error) {
      toast({ title: isRTL ? 'فشل التأكيد الجماعي' : 'Bulk failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: isRTL ? `تم تأكيد ${ids.length} تنبيه` : `${ids.length} alerts acknowledged` });
    qc.invalidateQueries({ queryKey: ['system_alerts'] });
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { key: 'critical', labelAr: 'حرجة', labelEn: 'Critical', value: counts.critical },
          { key: 'error', labelAr: 'أخطاء', labelEn: 'Errors', value: counts.error },
          { key: 'warning', labelAr: 'تحذيرات', labelEn: 'Warnings', value: counts.warning },
          { key: 'info', labelAr: 'معلومات', labelEn: 'Info', value: counts.info },
          { key: 'unack', labelAr: 'غير مؤكدة', labelEn: 'Unacknowledged', value: counts.unack },
        ] as const).map(s => (
          <Card key={s.key}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{isRTL ? s.labelAr : s.labelEn}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {isRTL ? 'تنبيهات النظام' : 'System Alerts'}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الخطورات' : 'All severities'}</SelectItem>
                <SelectItem value="critical">{isRTL ? 'حرجة' : 'Critical'}</SelectItem>
                <SelectItem value="error">{isRTL ? 'خطأ' : 'Error'}</SelectItem>
                <SelectItem value="warning">{isRTL ? 'تحذير' : 'Warning'}</SelectItem>
                <SelectItem value="info">{isRTL ? 'معلومة' : 'Info'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unack">{isRTL ? 'غير مؤكدة فقط' : 'Unacknowledged'}</SelectItem>
                <SelectItem value="ack">{isRTL ? 'مؤكدة' : 'Acknowledged'}</SelectItem>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={ackAll} disabled={busy === 'all' || counts.unack === 0}>
              {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              {isRTL ? 'تأكيد الكل' : 'Ack all'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">{isRTL ? 'لا توجد تنبيهات' : 'No alerts'}</p>
              <p className="text-sm mt-1">{isRTL ? 'النظام يعمل بشكل طبيعي' : 'System is healthy'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => {
                const meta = severityMeta[a.severity] || severityMeta.info;
                const Icon = meta.icon;
                return (
                  <div key={a.id} className={`border rounded-lg p-4 flex items-start gap-3 ${meta.bg} ${a.acknowledged ? 'opacity-60' : ''}`}>
                    <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={meta.color}>{a.severity}</Badge>
                        <Badge variant="outline" className="font-mono text-xs">{a.component}</Badge>
                        {a.reference_type && (
                          <Badge variant="secondary" className="text-xs">{a.reference_type}</Badge>
                        )}
                        {a.acknowledged && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {isRTL ? 'مؤكد' : 'ack'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium break-words">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleString()}
                        {a.acknowledged_at && ` · ${isRTL ? 'مؤكد' : 'acked'} ${new Date(a.acknowledged_at).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!a.acknowledged && (
                        <Button size="sm" onClick={() => ackOne(a.id)} disabled={busy === a.id}>
                          {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <Badge className={severityMeta[selected.severity].color}>{selected.severity}</Badge>}
              {isRTL ? 'تفاصيل التنبيه' : 'Alert details'}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">{isRTL ? 'المكوّن:' : 'Component:'}</span> <code className="font-mono">{selected.component}</code></div>
              <div><span className="font-semibold">{isRTL ? 'الرسالة:' : 'Message:'}</span> {selected.message}</div>
              {selected.reference_type && (
                <div>
                  <span className="font-semibold">{isRTL ? 'المرجع:' : 'Reference:'}</span>{' '}
                  <code className="font-mono">{selected.reference_type}</code>
                  {selected.reference_id && <code className="font-mono"> · {selected.reference_id}</code>}
                </div>
              )}
              <div>
                <p className="font-semibold mb-1">{isRTL ? 'السياق (Context):' : 'Context:'}</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-80">
                  {JSON.stringify(selected.context || {}, null, 2)}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(selected.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemAlertsTab;
