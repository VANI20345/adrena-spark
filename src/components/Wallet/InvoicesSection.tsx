import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Printer } from 'lucide-react';
import { InvoicePrintDialog, type PrintableInvoice } from './InvoicePrintDialog';

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_audience: string | null;
  reference_type: string;
  reference_id: string;
  gross_amount: number;
  commission_amount: number;
  vat_on_commission: number;
  net_commission: number;
  provider_net_amount: number;
  invoice_date: string;
  status: string;
  provider_name: string | null;
  customer_name: string | null;
  platform_vat_number: string | null;
  provider_vat_number: string | null;
};

const InvoicesSection = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const [printInvoice, setPrintInvoice] = useState<PrintableInvoice | null>(null);

  const { data: customerInvoices = [], isLoading: loadingCustomer } = useSupabaseQuery({
    queryKey: ['my_customer_invoices', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('platform_invoices')
        .select('*')
        .eq('customer_id', user.id)
        .eq('invoice_audience', 'customer')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Invoice[];
    }, [user?.id]),
    enabled: !!user?.id,
  });

  const { data: commissionInvoices = [], isLoading: loadingCommission } = useSupabaseQuery({
    queryKey: ['my_commission_invoices', user?.id],
    queryFn: useCallback(async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('platform_invoices')
        .select('*')
        .eq('provider_id', user.id)
        .eq('invoice_audience', 'provider')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Invoice[];
    }, [user?.id]),
    enabled: !!user?.id,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  const renderInvoiceCard = (inv: Invoice, kind: 'customer' | 'commission') => (
    <Card key={inv.id} className="border border-border/60">
      <CardContent className="p-4">
        <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold">{inv.invoice_number}</span>
              <Badge variant={inv.status === 'issued' ? 'default' : 'secondary'} className="text-xs">
                {inv.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(inv.invoice_date)}</p>
            {kind === 'customer' ? (
              <div className="mt-2 text-sm space-y-0.5">
                <p>{isRTL ? 'الإجمالي:' : 'Total:'} <strong>{inv.gross_amount.toFixed(2)} SAR</strong></p>
                <p className="text-muted-foreground text-xs">
                  {isRTL ? 'ضريبة القيمة المضافة (15% مضمّنة):' : 'VAT (15% included):'} {inv.vat_on_commission.toFixed(2)} SAR
                </p>
                {inv.provider_name && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'المزود:' : 'Provider:'} {inv.provider_name}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm space-y-0.5">
                <p>{isRTL ? 'العمولة:' : 'Commission:'} <strong>{inv.commission_amount.toFixed(2)} SAR</strong></p>
                <p className="text-muted-foreground text-xs">
                  {isRTL ? 'ضريبة على العمولة:' : 'VAT on commission:'} {inv.vat_on_commission.toFixed(2)} SAR
                </p>
                <p className="text-muted-foreground text-xs">
                  {isRTL ? 'صافي للمزود:' : 'Provider net:'} {inv.provider_net_amount.toFixed(2)} SAR
                </p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintInvoice(inv as unknown as PrintableInvoice)}
          >
            <Printer className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <FileText className="h-5 w-5 text-primary" />
          {isRTL ? 'فواتيري' : 'My Invoices'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customer">
          <TabsList>
            <TabsTrigger value="customer">
              {isRTL ? `فواتيري (${customerInvoices.length})` : `My invoices (${customerInvoices.length})`}
            </TabsTrigger>
            <TabsTrigger value="commission">
              {isRTL ? `فواتير العمولات (${commissionInvoices.length})` : `Commission invoices (${commissionInvoices.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="mt-4 space-y-3">
            {loadingCustomer ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل…' : 'Loading…'}</p>
            ) : customerInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'لا توجد فواتير بعد.' : 'No invoices yet.'}
              </p>
            ) : (
              customerInvoices.map((inv) => renderInvoiceCard(inv, 'customer'))
            )}
          </TabsContent>

          <TabsContent value="commission" className="mt-4 space-y-3">
            {loadingCommission ? (
              <p className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل…' : 'Loading…'}</p>
            ) : commissionInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'لا توجد فواتير عمولات بعد.' : 'No commission invoices yet.'}
              </p>
            ) : (
              commissionInvoices.map((inv) => renderInvoiceCard(inv, 'commission'))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <InvoicePrintDialog
        invoice={printInvoice}
        open={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
      />
    </Card>
  );
};

export default InvoicesSection;