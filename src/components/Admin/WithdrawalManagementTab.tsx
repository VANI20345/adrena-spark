import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle, Send, Banknote } from 'lucide-react';

type WithdrawalRow = {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  iban: string | null;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  reference_number: string;
  created_at: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  external_transfer_ref: string | null;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-blue-500',
  processing: 'bg-blue-600',
  completed: 'bg-green-600',
  rejected: 'bg-red-600',
  cancelled: 'bg-muted',
};

export const WithdrawalManagementTab = () => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'complete' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['withdrawal_summary'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_withdrawal_requests_summary');
      return data as any;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['withdrawal_requests', statusFilter],
    queryFn: async () => {
      let q = supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WithdrawalRow[];
    },
  });

  const openAction = (row: WithdrawalRow, type: 'approve' | 'complete' | 'reject') => {
    setSelected(row);
    setActionType(type);
    setNotes('');
    setTransferRef('');
  };

  const closeDialog = () => {
    setSelected(null);
    setActionType(null);
  };

  const submitAction = async () => {
    if (!selected || !actionType) return;
    if (actionType === 'reject' && !notes.trim()) {
      toast({ title: isRTL ? 'سبب الرفض مطلوب' : 'Rejection reason required', variant: 'destructive' });
      return;
    }
    if (actionType === 'complete' && !transferRef.trim()) {
      toast({ title: isRTL ? 'مرجع التحويل مطلوب' : 'Transfer reference required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc('admin_process_withdrawal', {
      p_request_id: selected.id,
      p_action: actionType,
      p_notes: notes || null,
      p_transfer_ref: transferRef || null,
    });
    setSubmitting(false);

    if (error || !(data as any)?.ok) {
      toast({
        title: isRTL ? 'فشلت العملية' : 'Action failed',
        description: (data as any)?.error || error?.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: isRTL ? 'تم بنجاح' : 'Success' });
    qc.invalidateQueries({ queryKey: ['withdrawal_requests'] });
    qc.invalidateQueries({ queryKey: ['withdrawal_summary'] });
    closeDialog();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isRTL ? 'قيد المراجعة' : 'Pending'}</p>
            <p className="text-2xl font-bold">{summary?.pending_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">{Number(summary?.pending_amount ?? 0).toFixed(2)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isRTL ? 'موافق عليها' : 'Approved'}</p>
            <p className="text-2xl font-bold">{summary?.approved_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">{Number(summary?.approved_amount ?? 0).toFixed(2)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isRTL ? 'مكتملة' : 'Completed'}</p>
            <p className="text-2xl font-bold">{summary?.completed_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">{Number(summary?.completed_amount ?? 0).toFixed(2)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isRTL ? 'مرفوضة' : 'Rejected'}</p>
            <p className="text-2xl font-bold">{summary?.rejected_count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {isRTL ? 'طلبات السحب' : 'Withdrawal Requests'}
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All'}</SelectItem>
              <SelectItem value="pending">{isRTL ? 'قيد المراجعة' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{isRTL ? 'موافق عليها' : 'Approved'}</SelectItem>
              <SelectItem value="completed">{isRTL ? 'مكتملة' : 'Completed'}</SelectItem>
              <SelectItem value="rejected">{isRTL ? 'مرفوضة' : 'Rejected'}</SelectItem>
              <SelectItem value="cancelled">{isRTL ? 'ملغاة' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد طلبات' : 'No requests'}</p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[r.status]}>{r.status}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{r.reference_number}</span>
                    </div>
                    <p className="font-bold text-lg">{Number(r.amount).toFixed(2)} SAR</p>
                    <p className="text-sm">
                      <strong>{r.bank_name}</strong> — {r.account_holder_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {r.iban ? `IBAN: ${r.iban}` : `Acc: ${r.account_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    {r.admin_notes && <p className="text-xs">📝 {r.admin_notes}</p>}
                    {r.rejection_reason && <p className="text-xs text-destructive">❌ {r.rejection_reason}</p>}
                    {r.external_transfer_ref && <p className="text-xs">🏦 {r.external_transfer_ref}</p>}
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => openAction(r, 'approve')}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />{isRTL ? 'موافقة' : 'Approve'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openAction(r, 'reject')}>
                          <XCircle className="h-4 w-4 mr-1" />{isRTL ? 'رفض' : 'Reject'}
                        </Button>
                      </>
                    )}
                    {(r.status === 'approved' || r.status === 'processing') && (
                      <Button size="sm" onClick={() => openAction(r, 'complete')}>
                        <Send className="h-4 w-4 mr-1" />{isRTL ? 'تأكيد التحويل' : 'Mark Sent'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected && !!actionType} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && (isRTL ? 'الموافقة على الطلب' : 'Approve Request')}
              {actionType === 'reject' && (isRTL ? 'رفض الطلب' : 'Reject Request')}
              {actionType === 'complete' && (isRTL ? 'تأكيد إتمام التحويل' : 'Confirm Transfer')}
            </DialogTitle>
            <DialogDescription>
              {selected && `${selected.reference_number} — ${Number(selected.amount).toFixed(2)} SAR`}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'complete' && (
            <div className="space-y-2">
              <label className="text-sm">{isRTL ? 'رقم مرجع التحويل البنكي' : 'Bank Transfer Reference'} *</label>
              <Input value={transferRef} onChange={(e) => setTransferRef(e.target.value)} placeholder="TXN-..." />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm">
              {actionType === 'reject'
                ? (isRTL ? 'سبب الرفض *' : 'Rejection Reason *')
                : (isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)')}
            </label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={submitAction} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isRTL ? 'تأكيد' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalManagementTab;
