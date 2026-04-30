import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Lock, Unlock, AlertTriangle, CheckCircle2, Clock, ShieldAlert, Wallet, PiggyBank,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface PaymentHold {
  id: string;
  source_type: string;
  source_id: string;
  provider_id: string;
  payer_id: string;
  gross_amount: number;
  platform_fee: number;
  vat_amount: number;
  net_amount: number;
  available_amount: number;
  held_amount: number;
  currency: string;
  status: 'held' | 'released' | 'refunded' | 'cancelled' | 'under_review';
  event_end_at: string | null;
  hold_until: string;
  released_at: string | null;
  complaint_extension: boolean;
  complaint_reason: string | null;
  notes: string | null;
  created_at: string;
}

const fmt = (amount: number, isRTL: boolean) =>
  new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2,
  }).format(amount);

export const PaymentHoldsSection = () => {
  const { isRTL } = useLanguageContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'held' | 'under_review' | 'released'>('held');
  const [releaseDialog, setReleaseDialog] = useState<PaymentHold | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');

  // Unified financial dashboard stats
  const { data: dashStats } = useQuery({
    queryKey: ['financial-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_dashboard_stats');
      if (error) throw error;
      return data as Record<string, number>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Holds list
  const { data: holds, isLoading } = useQuery({
    queryKey: ['payment-holds', tab],
    queryFn: async () => {
      const query = supabase.from('payment_holds').select('*');
      if (tab === 'released') {
        query.eq('status', 'released');
      } else if (tab === 'under_review') {
        query.or('status.eq.under_review,complaint_extension.eq.true');
      } else {
        query.eq('status', 'held').eq('complaint_extension', false);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as PaymentHold[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const releaseMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase.rpc('release_payment_hold', {
        p_hold_id: id, p_notes: notes || null,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'release_failed');
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الإفراج عن المبلغ المحجوز بنجاح' : 'Held amount released successfully');
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard-stats'] });
      setReleaseDialog(null);
      setReleaseNotes('');
    },
    onError: (e: any) => {
      toast.error(isRTL ? 'فشل الإفراج' : 'Release failed', { description: e.message });
    },
  });

  const stats = [
    {
      title: isRTL ? 'محجوز (30%)' : 'Held (30%)',
      value: fmt(Number(dashStats?.total_held || 0), isRTL),
      icon: Lock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    },
    {
      title: isRTL ? 'متاح فوري (70%)' : 'Released Immediate (70%)',
      value: fmt(Number(dashStats?.total_available_released || 0), isRTL),
      icon: PiggyBank,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: isRTL ? 'جاهز للإفراج' : 'Ready to Release',
      value: String(Number(dashStats?.count_ready || 0)),
      icon: Unlock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: isRTL ? 'تحت النزاع' : 'Under Dispute',
      value: String(Number(dashStats?.count_under_review || 0)),
      icon: ShieldAlert,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
  ];

  const sourceLabel = (s: string) =>
    isRTL
      ? ({ event_booking: 'فعالية', service_booking: 'خدمة', subscription: 'اشتراك', other: 'أخرى' } as any)[s] || s
      : s.replace('_', ' ');

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-900/40">
      <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-amber-600" />
          {isRTL ? 'تتبع الأموال (Escrow 70/30)' : 'Payment Tracking (Escrow 70/30)'}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? 'يتم تحرير 70% من أرباح المزود فوراً للمحفظة، و30% تبقى محجوزة 72 ساعة بعد انتهاء الفعالية. عند وجود نزاع يتم تجميد الإفراج تلقائياً.'
            : '70% of provider earnings are released immediately to wallet; 30% are held for 72h after event end. Disputes auto-freeze release.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-3 rounded-full shrink-0 ${s.bgColor}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
                    <p className="text-xl font-bold mt-1 tabular-nums" dir="ltr">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="held" className="gap-2">
              <Lock className="h-4 w-4" />
              {isRTL ? 'محجوز' : 'Held'}
            </TabsTrigger>
            <TabsTrigger value="under_review" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              {isRTL ? 'تحت النزاع' : 'Under Review'}
            </TabsTrigger>
            <TabsTrigger value="released" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {isRTL ? 'مُفرَج' : 'Released'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <div className="rounded-md border">
              <Table dir={isRTL ? 'rtl' : 'ltr'}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الإجمالي' : 'Gross'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'متاح فوري (70%)' : 'Available (70%)'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'محجوز (30%)' : 'Held (30%)'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'موعد الإفراج' : 'Release Date'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isRTL ? 'جاري التحميل...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : !holds || holds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isRTL ? 'لا توجد سجلات في هذه الفئة' : 'No records in this category'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    holds.map((h) => {
                      const isReady = new Date(h.hold_until) <= new Date() && !h.complaint_extension && h.status === 'held';
                      return (
                        <TableRow key={h.id}>
                          <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                            <Badge variant="outline">{sourceLabel(h.source_type)}</Badge>
                          </TableCell>
                          <TableCell className={`font-mono tabular-nums ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                            {fmt(Number(h.gross_amount), isRTL)}
                          </TableCell>
                          <TableCell className={`font-mono tabular-nums text-green-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                            {fmt(Number(h.available_amount || 0), isRTL)}
                          </TableCell>
                          <TableCell className={`font-mono tabular-nums text-amber-600 font-bold ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                            {fmt(Number(h.held_amount || 0), isRTL)}
                          </TableCell>
                          <TableCell className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(h.hold_until), {
                                addSuffix: true, locale: isRTL ? ar : enUS,
                              })}
                            </div>
                          </TableCell>
                          <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                            {h.status === 'released' ? (
                              <Badge className="bg-green-600 hover:bg-green-700">{isRTL ? 'مُفرَج' : 'Released'}</Badge>
                            ) : h.complaint_extension || h.status === 'under_review' ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {isRTL ? 'نزاع نشط' : 'Active Dispute'}
                              </Badge>
                            ) : isReady ? (
                              <Badge className="bg-blue-600 hover:bg-blue-700">{isRTL ? 'جاهز' : 'Ready'}</Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                {isRTL ? 'محجوز' : 'Held'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                            {h.status === 'released' ? (
                              <span className="text-xs text-muted-foreground">
                                {h.released_at && new Date(h.released_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant={isReady ? 'default' : 'outline'}
                                disabled={h.complaint_extension}
                                onClick={() => setReleaseDialog(h)}
                                title={h.complaint_extension ? (isRTL ? 'يوجد نزاع مفتوح' : 'Active dispute') : ''}
                              >
                                <Unlock className="h-3 w-3 mr-1" />
                                {isRTL ? 'إفراج' : 'Release'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Release dialog */}
      <Dialog open={!!releaseDialog} onOpenChange={(o) => !o && setReleaseDialog(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL ? 'تأكيد الإفراج عن المبلغ المحجوز' : 'Confirm Release'}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? `سيتم تحويل ${releaseDialog ? fmt(Number(releaseDialog.held_amount), true) : ''} (الـ 30% المحجوز) إلى محفظة المزود.`
                : `${releaseDialog ? fmt(Number(releaseDialog.held_amount), false) : ''} (the held 30%) will be moved to the provider's available balance.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={() => releaseDialog && releaseMutation.mutate({ id: releaseDialog.id, notes: releaseNotes })}
              disabled={releaseMutation.isPending}
            >
              <Unlock className="h-4 w-4 mr-1" />
              {isRTL ? 'تأكيد الإفراج' : 'Confirm Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
