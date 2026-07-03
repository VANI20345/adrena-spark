import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

const TX_TYPES = [
  { value: 'all', label_ar: 'الكل', label_en: 'All' },
  { value: 'booking_payment', label_ar: 'دفع حجز', label_en: 'Booking Payment' },
  { value: 'hold_created', label_ar: 'إنشاء حجز مالي', label_en: 'Hold Created' },
  { value: 'hold_released', label_ar: 'إفراج عن محجوز', label_en: 'Hold Released' },
  { value: 'withdrawal', label_ar: 'سحب', label_en: 'Withdrawal' },
  { value: 'refund', label_ar: 'استرداد', label_en: 'Refund' },
];

export const FinancialAuditLogSection = () => {
  const { isRTL } = useLanguageContext();
  const [type, setType] = useState('all');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['financial-audit-logs', type, page],
    queryFn: async () => {
      let q = supabase
        .from('financial_transaction_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (type !== 'all') q = q.eq('transaction_type', type);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const fmt = (n: number) =>
    `${Number(n || 0).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 })} ${isRTL ? 'ريال' : 'SAR'}`;

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = ['created_at', 'transaction_type', 'amount', 'commission_amount', 'vat_amount', 'net_amount', 'status', 'reference_type', 'reference_id'];
    const csv = [headers.join(','), ...data.rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <Card>
      <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isRTL ? 'السجل المالي الموحد (Audit Trail)' : 'Unified Financial Audit Log'}
        </CardTitle>
        <CardDescription>
          {isRTL ? 'كل الحركات المالية مسجلة هنا (دفع، حجز، إفراج، سحب، استرداد).' : 'All money movements (payment, hold, release, withdrawal, refund).'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-64" dir={isRTL ? 'rtl' : 'ltr'}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
              {TX_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{isRTL ? t.label_ar : t.label_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv} disabled={!data?.rows.length}>
            <Download className="h-4 w-4 mr-2" />
            {isRTL ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table dir={isRTL ? 'rtl' : 'ltr'}>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'النوع' : 'Type'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'العمولة' : 'Commission'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الصافي' : 'Net'}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : !data?.rows.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isRTL ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
              ) : (
                data.rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant="outline">{r.transaction_type}</Badge>
                    </TableCell>
                    <TableCell className={`font-mono tabular-nums ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{fmt(r.amount)}</TableCell>
                    <TableCell className={`font-mono tabular-nums ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{fmt(r.commission_amount)}</TableCell>
                    <TableCell className={`font-mono tabular-nums ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{fmt(r.net_amount)}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isRTL ? `صفحة ${page + 1} من ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
