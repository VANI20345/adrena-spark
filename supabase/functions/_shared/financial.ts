/**
 * المحرك الحسابي المالي الموحّد (Single Source of Truth)
 *
 * يستخدمه: process-payment, payment-webhook, create-service-booking,
 * generate_booking_invoices, وأي edge function يحسب القيمة المالية.
 *
 * النموذج: VAT-Inclusive (السعر النهائي يشمل الضريبة)
 *   vat                = total * 15 / 115        (مستخرج من السعر)
 *   netAmount          = total - vat              (المبلغ بدون ضريبة)
 *   platformCommission = netAmount * rate / 100   (العمولة من الصافي)
 *   commissionVat      = platformCommission * 15% (ضريبة على العمولة)
 *   providerEarnings   = netAmount - platformCommission
 *
 * مثال: total = 115 SAR, rate = 10%
 *   vat                = 115 * 15/115 = 15.00
 *   netAmount          = 100.00
 *   platformCommission = 100 * 10% = 10.00
 *   commissionVat      = 10 * 15% = 1.50
 *   providerEarnings   = 100 - 10 = 90.00
 */

export const VAT_RATE = 0.15;

export interface FinancialBreakdown {
  total: number;              // المبلغ الكلي المدفوع (شامل الضريبة)
  vat: number;                // الضريبة المستخرجة من المبلغ الكلي
  netAmount: number;          // الصافي بعد الضريبة
  commissionRate: number;     // نسبة العمولة المطبّقة (%)
  platformCommission: number; // عمولة المنصة (من الصافي)
  commissionVat: number;      // ضريبة على العمولة (15%)
  providerEarnings: number;   // ما يستحقه المزود
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * الحساب الرسمي الموحّد. يجب أن تستدعيه كل edge function تتعامل مع المبالغ.
 */
export function calculateBreakdown(
  totalAmount: number,
  commissionRate: number,
  isExempt: boolean = false,
): FinancialBreakdown {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Invalid totalAmount: must be a positive number");
  }
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    throw new Error("Invalid commissionRate: must be 0..100");
  }

  const effectiveRate = isExempt ? 0 : commissionRate;

  const vat = round2(totalAmount * VAT_RATE / (1 + VAT_RATE));
  const netAmount = round2(totalAmount - vat);
  const platformCommission = round2(netAmount * effectiveRate / 100);
  const commissionVat = round2(platformCommission * VAT_RATE);
  const providerEarnings = round2(netAmount - platformCommission);

  return {
    total: round2(totalAmount),
    vat,
    netAmount,
    commissionRate: effectiveRate,
    platformCommission,
    commissionVat,
    providerEarnings,
  };
}

/**
 * يجلب نسبة العمولة من system_settings حسب نوع الحجز.
 */
export async function getCommissionRate(
  supabase: any,
  bookingType: "events" | "services" | "training",
): Promise<number> {
  const key = `commission_${bookingType}`;
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const pct = data?.value?.percentage;
  return Number.isFinite(pct) ? Number(pct) : 10;
}
