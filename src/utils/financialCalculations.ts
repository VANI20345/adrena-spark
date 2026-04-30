/**
 * Centralized Financial Calculations Module
 *
 * VAT-Inclusive Pricing Model (يجب أن يطابق supabase/functions/_shared/financial.ts)
 *   vat                = total * 15 / 115        (مستخرج من السعر)
 *   netAmount          = total - vat              (الصافي بعد الضريبة)
 *   platformCommission = netAmount * rate / 100   (العمولة من الصافي)
 *   commissionVat      = platformCommission * 15% (ضريبة على العمولة)
 *   providerEarnings   = netAmount - platformCommission
 *
 * مثال: 115 SAR, rate = 10%
 *   vat = 15.00, net = 100.00
 *   platformCommission = 10.00, commissionVat = 1.50
 *   providerEarnings = 90.00
 */

// Constants
export const VAT_RATE = 0.15; // 15% VAT in Saudi Arabia
export const DEFAULT_COMMISSION_RATES = {
  events: 10,
  services: 10,
  training: 10,
} as const;

export type ServiceType = 'events' | 'services' | 'training';

export interface FinancialBreakdown {
  /** المبلغ الكلي المدفوع (شامل الضريبة) */
  totalAmount: number;
  /** نسبة العمولة المطبقة (%) */
  commissionRate: number;
  /** الصافي بعد استخراج ضريبة القيمة المضافة من المبلغ الكلي */
  netAmount: number;
  /** الضريبة المستخرجة من المبلغ الكلي (15/115) */
  vat: number;
  /** عمولة المنصة (محسوبة من الصافي) */
  platformCommission: number;
  /** الضريبة المضافة على العمولة (15% من العمولة) */
  vatOnCommission: number;
  /** صافي العمولة بعد الضريبة (للتوافق العكسي) */
  netCommission: number;
  /** ما يستحقه المزود */
  providerEarnings: number;
  /** خصم/إعفاء من العمولة */
  isDiscounted: boolean;
}

/**
 * المحرك الحسابي الرسمي. يجب أن يطابق `_shared/financial.ts` في الـ edge functions.
 */
export function calculateFinancialBreakdown(
  totalAmount: number,
  commissionRate: number,
  isDiscounted: boolean = false
): FinancialBreakdown {
  const effectiveRate = isDiscounted ? 0 : commissionRate;

  // 1) استخرج الضريبة من المبلغ الكلي
  const vat = totalAmount * VAT_RATE / (1 + VAT_RATE);
  // 2) الصافي بدون ضريبة
  const netAmount = totalAmount - vat;
  // 3) عمولة المنصة من الصافي
  const platformCommission = netAmount * effectiveRate / 100;
  // 4) ضريبة على العمولة (تُضاف للحكومة)
  const vatOnCommission = platformCommission * VAT_RATE;
  // 5) صافي العمولة (= العمولة نفسها قبل ضريبتها — للتوافق)
  const netCommission = platformCommission;
  // 6) ما يحصل عليه المزود
  const providerEarnings = netAmount - platformCommission;

  return {
    totalAmount: roundToTwoDecimals(totalAmount),
    commissionRate: effectiveRate,
    netAmount: roundToTwoDecimals(netAmount),
    vat: roundToTwoDecimals(vat),
    platformCommission: roundToTwoDecimals(platformCommission),
    vatOnCommission: roundToTwoDecimals(vatOnCommission),
    netCommission: roundToTwoDecimals(netCommission),
    providerEarnings: roundToTwoDecimals(providerEarnings),
    isDiscounted,
  };
}

/**
 * Calculate VAT amount from a VAT-inclusive price
 * Formula: VAT = price - (price / 1.15)
 */
export function extractVatFromInclusive(vatInclusiveAmount: number): number {
  const vatAmount = vatInclusiveAmount - (vatInclusiveAmount / (1 + VAT_RATE));
  return roundToTwoDecimals(vatAmount);
}

/**
 * Calculate the base amount (excluding VAT) from a VAT-inclusive price
 */
export function extractBaseFromInclusive(vatInclusiveAmount: number): number {
  return roundToTwoDecimals(vatInclusiveAmount / (1 + VAT_RATE));
}

/**
 * Get the commission rate for a specific service type
 */
export function getCommissionRateForType(
  type: ServiceType,
  rates: typeof DEFAULT_COMMISSION_RATES = DEFAULT_COMMISSION_RATES
): number {
  return rates[type] ?? DEFAULT_COMMISSION_RATES.services;
}

/**
 * Determine the service type category from a service's service_type field
 */
export function categorizeServiceType(serviceType: string | null | undefined): ServiceType {
  if (serviceType === 'training') return 'training';
  return 'services';
}

/**
 * Check if a service is discounted and should be exempt from commission
 */
export function isServiceDiscounted(
  serviceType: string | null | undefined,
  discountPercentage: number | null | undefined
): boolean {
  return serviceType === 'discount' || (discountPercentage != null && discountPercentage > 0);
}

/**
 * Round a number to 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  locale: 'ar' | 'en' = 'ar'
): string {
  const formatted = roundToTwoDecimals(amount).toLocaleString();
  return locale === 'ar' ? `${formatted} ريال` : `${formatted} SAR`;
}

/**
 * Calculate the effective price after applying a discount
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercentage: number
): number {
  const discountAmount = (originalPrice * discountPercentage) / 100;
  return roundToTwoDecimals(originalPrice - discountAmount);
}

/**
 * Calculate savings from a discount
 */
export function calculateSavings(
  originalPrice: number,
  discountedPrice: number
): number {
  return roundToTwoDecimals(originalPrice - discountedPrice);
}

/**
 * Validate that a price is valid (non-negative)
 */
export function isValidPrice(price: number | null | undefined): boolean {
  return price != null && price >= 0 && !isNaN(price);
}

/**
 * Generate invoice data for ZATCA compliance (internal only, no API calls)
 */
export interface InvoiceData {
  invoiceNumber: string;
  invoiceType: 'simplified' | 'standard';
  referenceType: 'event_booking' | 'service_booking';
  referenceId: string;
  providerId: string;
  providerName: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vatOnCommission: number;
  netCommission: number;
  providerNetAmount: number;
  invoiceDate: Date;
}

/**
 * Prepare invoice data for storage (no external API calls)
 */
export function prepareInvoiceData(
  referenceType: 'event_booking' | 'service_booking',
  referenceId: string,
  providerId: string,
  providerName: string,
  breakdown: FinancialBreakdown
): Omit<InvoiceData, 'invoiceNumber'> {
  return {
    invoiceType: 'simplified',
    referenceType,
    referenceId,
    providerId,
    providerName,
    grossAmount: breakdown.totalAmount,
    commissionRate: breakdown.commissionRate,
    commissionAmount: breakdown.platformCommission,
    vatOnCommission: breakdown.vatOnCommission,
    netCommission: breakdown.netCommission,
    providerNetAmount: breakdown.providerEarnings,
    invoiceDate: new Date(),
  };
}
