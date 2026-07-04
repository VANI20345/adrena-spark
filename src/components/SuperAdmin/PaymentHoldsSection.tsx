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
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { toEnglishDigits } from '@/utils/dateFormat';

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
  review_state: 'pending' | 'ready_for_release' | 'dispute_hold';
  event_end_at: string | null;
  hold_until: string;
  released_at: string | null;
  complaint_extension: boolean;
  complaint_reason: string | null;
  notes: string | null;
  created_at: string;
  provider_name?: string;
  payer_name?: string;
}

const fmt = (amount: number, isRTL: boolean) =>
  new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2,
  }).format(amount);

export const PaymentHoldsSection = () => {
  const { isRTL } = useLanguageContext();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const [tab, setTab] = useState<'pending' | 'ready' | 'dispute' | 'released'>('ready');
  const [releaseDialog, setReleaseDialog] = useState<PaymentHold | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [forceRelease, setForceRelease] = useState(false);

  // Fetch live wallet_hold_percent from system_settings
  const { data: holdPercent = 30 } = useQuery({
    queryKey: ['wallet-hold-percent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'wallet_hold_percent')
        .maybeSingle();
      if (error) throw error;
      return Number(data?.value) || 30;
    },
    staleTime: 30 * 1000, // refetch every 30s
  });
  const availablePercent = 100 - holdPercent;

  // Live wallet_hold_hours from system_settings (default 72h)
  const { data: holdHours = 72 } = useQuery({
    queryKey: ['wallet-hold-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'wallet_hold_hours')
        .maybeSingle();
      if (error) throw error;
      const n = Number(data?.value);
      return Number.isFinite(n) && n > 0 ? n : 72;
    },
    staleTime: 30 * 1000,
  });

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
      } else if (tab === 'dispute') {
        query.eq('status', 'held').eq('review_state', 'dispute_hold');
      } else if (tab === 'ready') {
        query.eq('status', 'held').eq('review_state', 'ready_for_release').eq('complaint_extension', false);
      } else {
        // pending: still in 72h window
        query.eq('status', 'held').eq('review_state', 'pending').eq('complaint_extension', false);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (error) throw error;

      const holdsData = (data || []) as PaymentHold[];
      if (holdsData.length > 0) {
        const userIds = Array.from(new Set([
          ...holdsData.map(h => h.provider_id),
          ...holdsData.map(h => h.payer_id)
        ]));

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
          holdsData.forEach(h => {
            h.provider_name = profileMap.get(h.provider_id) || (isRTL ? 'غير معروف' : 'Unknown');
            h.payer_name = profileMap.get(h.payer_id) || (isRTL ? 'غير معروف' : 'Unknown');
          });
        }
      }
      return holdsData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const releaseMutation = useMutation({
    mutationFn: async ({ id, notes, force }: { id: string; notes: string; force?: boolean }) => {
      const { data, error } = await supabase.rpc('release_payment_hold', {
        p_hold_id: id,
        p_notes: notes || null,
        p_force: force || false
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
      setForceRelease(false);
    },
    onError: (e: any) => {
      toast.error(isRTL ? 'فشل الإفراج' : 'Release failed', { description: e.message });
      // Refetch in case the row was self-healed by the RPC
      queryClient.invalidateQueries({ queryKey: ['payment-holds'] });
    },
  });

  const stats = [
    {
      title: isRTL ? `محجوز (${holdPercent}%)` : `Held (${holdPercent}%)`,
      value: fmt(Number(dashStats?.total_held || 0), isRTL),
      icon: Lock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    },
    {
      title: isRTL ? `متاح فوري (${availablePercent}%)` : `Released Immediate (${availablePercent}%)`,
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
          {isRTL ? `تتبع الأموال (Escrow ${availablePercent}/${holdPercent})` : `Payment Tracking (Escrow ${availablePercent}/${holdPercent})`}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? `يتم تحرير ${availablePercent}% من أرباح المزود فوراً للمحفظة، و${holdPercent}% تبقى محجوزة ${holdHours} ساعة بعد انتهاء الفعالية. عند وجود نزاع يتم تجميد الإفراج تلقائياً.`
            : `${availablePercent}% of provider earnings are released immediately to wallet; ${holdPercent}% are held for ${holdHours}h after event end. Disputes auto-freeze release.`}
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
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="ready" className="gap-2">
              <Unlock className="h-4 w-4" />
              {isRTL ? 'جاهز للإفراج' : 'Ready'}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Lock className="h-4 w-4" />
              {isRTL ? 'قيد المراجعة' : 'Pending'}
            </TabsTrigger>
            <TabsTrigger value="dispute" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              {isRTL ? 'تحت النزاع' : 'Dispute'}
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
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? `متاح فوري (${availablePercent}%)` : `Available (${availablePercent}%)`}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? `محجوز (${holdPercent}%)` : `Held (${holdPercent}%)`}</TableHead>
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
                      const isDispute = h.review_state === 'dispute_hold' || h.complaint_extension;
                      const isReady = h.status === 'held' && h.review_state === 'ready_for_release' && !h.complaint_extension;
                      const isPending = h.status === 'held' && h.review_state === 'pending' && !h.complaint_extension;
                      const releaseTooltip = isDispute
                        ? (isRTL ? 'يوجد نزاع/استرداد مفتوح' : 'Active dispute or refund')
                        : isPending
                          ? (isRTL ? `متاح بعد ${toEnglishDigits(new Date(h.hold_until).toLocaleString('en-US'))}` : `Available after ${toEnglishDigits(new Date(h.hold_until).toLocaleString('en-US'))}`)
                          : '';
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
                            ) : isDispute ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {isRTL ? 'تحت النزاع' : 'Dispute Hold'}
                              </Badge>
                            ) : isReady ? (
                              <Badge className="bg-green-600 hover:bg-green-700">{isRTL ? 'جاهز للإفراج' : 'Ready'}</Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                {isRTL ? 'قيد المراجعة' : 'Pending'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                            {h.status === 'released' ? (
                              <span className="text-xs text-muted-foreground">
                                {h.released_at && toEnglishDigits(new Date(h.released_at).toLocaleDateString('en-US'))}
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant={isReady ? 'default' : 'outline'}
                                className={isReady ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => setReleaseDialog(h)}
                                title={releaseTooltip}
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
      <Dialog 
        open={!!releaseDialog} 
        onOpenChange={(o) => {
          if (!o) {
            setReleaseDialog(null);
            setForceRelease(false);
            setReleaseNotes('');
          }
        }}
      >
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md md:max-w-lg border border-amber-200 dark:border-amber-900/40">
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL ? 'تفاصيل وتأكيد الإفراج عن الأموال' : 'Confirm Release of Held Funds'}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL 
                ? 'يرجى مراجعة تفاصيل المعاملة وأصحاب العلاقة قبل الإفراج عن المبلغ الضماني.'
                : 'Please review transaction details and stakeholders before releasing the escrowed amount.'}
            </DialogDescription>
          </DialogHeader>

          {releaseDialog && (
            <div className="space-y-4 my-2 text-sm">
              {/* Stakeholders Block */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2 border">
                <div className="font-semibold text-muted-foreground mb-1">
                  {isRTL ? 'أصحاب العلاقة (Stakeholders)' : 'Stakeholders'}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">{isRTL ? 'المستلم (المزود):' : 'Receiver (Provider):'}</span>
                  <span className="col-span-2 font-medium text-foreground">
                    {releaseDialog.provider_name || (isRTL ? 'غير معروف' : 'Unknown')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">{isRTL ? 'الدافع (العميل):' : 'Payer (Customer):'}</span>
                  <span className="col-span-2 font-medium text-foreground">
                    {releaseDialog.payer_name || (isRTL ? 'غير معروف' : 'Unknown')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">{isRTL ? 'نوع المعاملة:' : 'Source Type:'}</span>
                  <span className="col-span-2 font-medium text-foreground">
                    <Badge variant="outline" className="text-xs">
                      {sourceLabel(releaseDialog.source_type)}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">{isRTL ? 'رقم المرجع (ID):' : 'Reference ID:'}</span>
                  <span className="col-span-2 font-mono text-xs text-muted-foreground truncate">
                    {releaseDialog.source_id}
                  </span>
                </div>
              </div>

              {/* Destination Block */}
              <div className="p-3 bg-green-500/10 dark:bg-green-500/5 rounded-lg border border-green-500/20 space-y-1">
                <div className="font-semibold text-green-700 dark:text-green-400">
                  {isRTL ? 'مسار جهة الأموال (Destination)' : 'Destination of Funds'}
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {isRTL
                    ? `سيتم تحويل الأموال مباشرة إلى المحفظة الإلكترونية الخاصة بالمزود (${releaseDialog.provider_name || 'غير معروف'}) وتضاف لرصيده المتاح للسحب.`
                    : `Funds will be directly credited to the provider's wallet (${releaseDialog.provider_name || 'Unknown'}) as withdrawable balance.`}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 rounded-lg border border-amber-500/20 space-y-2">
                <div className="font-semibold text-amber-700 dark:text-amber-400">
                  {isRTL ? 'الملخص المالي (Financial Summary)' : 'Financial Summary'}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">{isRTL ? 'المبلغ الإجمالي:' : 'Gross Amount:'}</span>
                  <span className="text-right font-mono font-semibold" dir="ltr">{fmt(Number(releaseDialog.gross_amount), isRTL)}</span>
                  
                  <span className="text-muted-foreground">{isRTL ? 'المحرر فوراً (70%):' : 'Released Immediately (70%):'}</span>
                  <span className="text-right text-green-600 font-mono" dir="ltr">{fmt(Number(releaseDialog.available_amount || 0), isRTL)}</span>
                  
                  <span className="text-muted-foreground font-bold">{isRTL ? 'المحتجز للإفراج (30%):' : 'Escrow Held (30%):'}</span>
                  <span className="text-right text-amber-600 font-mono font-bold" dir="ltr">{fmt(Number(releaseDialog.held_amount || 0), isRTL)}</span>
                </div>
              </div>

              {/* Status and Action validations */}
              {(() => {
                const isReady = releaseDialog.status === 'held' && releaseDialog.review_state === 'ready_for_release' && !releaseDialog.complaint_extension;
                const isDispute = releaseDialog.review_state === 'dispute_hold' || releaseDialog.complaint_extension;
                
                return (
                  <>
                    {!isReady && (
                      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            {isDispute 
                              ? (isRTL ? 'تنبيه: المعاملة تحت النزاع' : 'Warning: Hold under Dispute')
                              : (isRTL ? 'تنبيه: فترة الحجز لم تنتهِ' : 'Warning: Escrow Period Active')}
                          </span>
                        </div>
                        <p className="text-xs text-red-600/80 leading-relaxed">
                          {isDispute
                            ? (isRTL 
                                ? 'يوجد نزاع نشط أو طلب استرداد على هذا الحجز. الإفراج العادي محظور لحين حل النزاع.' 
                                : 'An active dispute or refund request exists. Standard release is blocked.')
                            : (isRTL 
                                ? `المبلغ لا يزال قيد الحجز الزمني ولا ينتهي القفل إلا بتاريخ ${toEnglishDigits(new Date(releaseDialog.hold_until).toLocaleString('en-US'))}.` 
                                : `Funds are locked until ${toEnglishDigits(new Date(releaseDialog.hold_until).toLocaleString('en-US'))}.`)}
                        </p>

                        {isSuperAdmin ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox 
                              id="force-release-chk" 
                              checked={forceRelease} 
                              onCheckedChange={(checked) => setForceRelease(!!checked)} 
                            />
                            <label htmlFor="force-release-chk" className="text-xs font-medium text-red-700 dark:text-red-400 cursor-pointer select-none">
                              {isRTL ? 'أريد فرض الإفراج بالقوة وتجاوز القيود (سوبر أدمن)' : 'Force Release & bypass constraints (Super Admin)'}
                            </label>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-red-700">
                            {isRTL ? 'يتطلب تخطي هذا القفل صلاحيات سوبر أدمن.' : 'Bypassing this lock requires Super Admin privileges.'}
                          </p>
                        )}
                      </div>
                    )}

                    <Textarea
                      placeholder={
                        !isReady 
                          ? (isRTL ? 'ملاحظات الإفراج القسري (مطلوبة في حال الإفراج بالقوة)' : 'Force release notes (required)') 
                          : (isRTL ? 'ملاحظات الإفراج (اختياري)' : 'Release notes (optional)')
                      }
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="mt-2"
                    />

                    <DialogFooter className="gap-2 pt-2">
                      <Button variant="outline" onClick={() => {
                        setReleaseDialog(null);
                        setForceRelease(false);
                        setReleaseNotes('');
                      }}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </Button>
                      <Button
                        onClick={() => releaseMutation.mutate({ 
                          id: releaseDialog.id, 
                          notes: releaseNotes, 
                          force: forceRelease 
                        })}
                        disabled={
                          releaseMutation.isPending || 
                          (!isReady && !forceRelease) || 
                          (!isReady && forceRelease && !releaseNotes.trim())
                        }
                        className={isReady ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                      >
                        {releaseMutation.isPending ? (
                          isRTL ? 'جاري التنفيذ...' : 'Processing...'
                        ) : (
                          <>
                            <Unlock className="h-4 w-4 mr-1" />
                            {isReady 
                              ? (isRTL ? 'تأكيد الإفراج' : 'Confirm Release') 
                              : (isRTL ? 'تأكيد الإفراج القسري' : 'Confirm Force Release')}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
