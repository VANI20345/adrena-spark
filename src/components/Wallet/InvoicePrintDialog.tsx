import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { buildZatcaQrBase64 } from '@/utils/zatcaQr';
import { useLanguageContext } from '@/contexts/LanguageContext';

export interface PrintableInvoice {
  invoice_number: string;
  invoice_audience: string | null;
  invoice_date: string;
  status: string;
  gross_amount: number;
  commission_amount: number;
  vat_on_commission: number;
  net_commission: number;
  provider_net_amount: number;
  provider_name: string | null;
  provider_vat_number: string | null;
  customer_name: string | null;
  platform_vat_number: string | null;
  zatca_qr_code?: string | null;
  total_vat_amount?: number;
}

interface Props {
  invoice: PrintableInvoice | null;
  open: boolean;
  onClose: () => void;
}

const PLATFORM_NAME = 'Hiwaya Platform';

export const InvoicePrintDialog: React.FC<Props> = ({ invoice, open, onClose }) => {
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const isProviderInvoice = invoice.invoice_audience === 'provider';
  const sellerName = PLATFORM_NAME;
  const vatNumber = invoice.platform_vat_number || '000000000000000';
  const invoiceTotal = isProviderInvoice
    ? Number(invoice.commission_amount)
    : Number(invoice.gross_amount);
  const vatTotal = isProviderInvoice
    ? Number(invoice.vat_on_commission || 0)
    : Number(invoice.total_vat_amount || 0);
  const customerSubtotal = Number(invoice.gross_amount) - vatTotal;

  const qrBase64 = invoice.zatca_qr_code || buildZatcaQrBase64({
    sellerName,
    vatNumber,
    timestamp: invoice.invoice_date,
    invoiceTotal,
    vatTotal,
  });

  const handlePrint = () => {
    const html = printRef.current?.outerHTML || '';
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    w.document.write(`<!doctype html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}"><head><meta charset="utf-8"><title>${invoice.invoice_number}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;padding:32px;color:#0a0a0a;background:#fff}
        .inv{max-width:760px;margin:0 auto}
        h1{font-size:22px;margin:0 0 4px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:10px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:${isRTL ? 'right' : 'left'}}
        th{background:#f7f7f7;font-weight:600}
        .totals td{border:none;padding:6px 10px}
        .totals .grand{font-size:16px;font-weight:700;border-top:2px solid #000}
        .header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px;border-bottom:2px solid #000;padding-bottom:12px}
        .qr{text-align:center}
        .qr img,.qr svg{width:140px;height:140px}
        .badge{display:inline-block;padding:2px 10px;border:1px solid #ccc;border-radius:999px;font-size:11px;margin-${isRTL ? 'right' : 'left'}:8px}
        @media print{body{padding:0}}
      </style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script></body></html>`);
    w.document.close();
  };

  const fmt = (n: number) => Number(n || 0).toFixed(2);
  const dateStr = new Date(invoice.invoice_date).toLocaleString(isRTL ? 'ar-SA' : 'en-US');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isRTL ? 'فاتورة ضريبية' : 'Tax Invoice'} — {invoice.invoice_number}</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-1" /> {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="inv bg-white text-foreground p-6 rounded">
          <div className="header flex justify-between items-start gap-4 border-b-2 border-foreground pb-3 mb-6">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-xl font-bold">{isRTL ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}</h1>
              <p className="muted text-xs text-muted-foreground mt-1">
                {sellerName} — VAT: {vatNumber}
              </p>
              <p className="muted text-xs text-muted-foreground">
                {isRTL ? 'رقم الفاتورة:' : 'Invoice #:'} <strong>{invoice.invoice_number}</strong>
              </p>
              <p className="muted text-xs text-muted-foreground">
                {isRTL ? 'التاريخ:' : 'Date:'} {dateStr}
              </p>
              <span className="badge">{invoice.status}</span>
            </div>
            <div className="qr">
              <QRCodeSVG value={qrBase64} size={140} level="M" includeMargin />
              <p className="muted text-[10px] text-muted-foreground mt-1">ZATCA QR</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>{isRTL ? 'الوصف' : 'Description'}</th>
                <th>{isRTL ? 'المبلغ (SAR)' : 'Amount (SAR)'}</th>
              </tr>
            </thead>
            <tbody>
              {isProviderInvoice ? (
                <>
                  <tr>
                    <td>{isRTL ? 'عمولة المنصة (غير شاملة الضريبة)' : 'Platform Commission (Excl. VAT)'}</td>
                    <td>{fmt(invoice.net_commission)}</td>
                  </tr>
                  <tr>
                    <td>{isRTL ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</td>
                    <td>{fmt(invoice.vat_on_commission)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td>{isRTL ? 'مبلغ الفعالية / الخدمة (غير شامل الضريبة)' : 'Event / Service Amount (Excl. VAT)'}</td>
                    <td>{fmt(customerSubtotal)}</td>
                  </tr>
                  <tr>
                    <td>{isRTL ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</td>
                    <td>{fmt(vatTotal)}</td>
                  </tr>
                </>
              )}
            </tbody>
            <tfoot className="totals">
              <tr className="grand">
                <td><strong>{isRTL ? 'الإجمالي (شامل الضريبة)' : 'Total (VAT incl.)'}</strong></td>
                <td><strong>{fmt(invoiceTotal)} SAR</strong></td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 text-xs text-muted-foreground">
            {invoice.provider_name && (
              <p>{isRTL ? 'المزود:' : 'Provider:'} {invoice.provider_name} {invoice.provider_vat_number ? `(VAT ${invoice.provider_vat_number})` : ''}</p>
            )}
            {invoice.customer_name && (
              <p>{isRTL ? 'العميل:' : 'Customer:'} {invoice.customer_name}</p>
            )}
            <p className="mt-2">{isRTL ? 'هذه فاتورة ضريبية مبسطة وفق متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).' : 'This is a Simplified Tax Invoice per ZATCA regulations.'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
