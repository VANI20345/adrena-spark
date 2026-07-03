/**
 * Frontend Financial Module — FORMATTERS ONLY
 *
 * ⚠️ القاعدة: لا حسابات مالية على الفرونت.
 *   - commission / VAT / provider_earnings تُحسب فقط في DB (RPC) و edge functions.
 *   - هذا الملف يحتوي فقط على دوال عرض/تنسيق + خصومات بسيطة لا تمس العمولة.
 *
 * إذا احتجت قيمة مالية: اقرأها من جدول DB (bookings/service_bookings/payment_holds/platform_invoices).
 */

export const VAT_RATE = 0.15; // ثابت للعرض فقط (label)

export type ServiceType = 'events' | 'services' | 'training';

/** تقريب لخانتين عشريتين — أداة تنسيق فقط. */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** تنسيق العملة للعرض. */
export function formatCurrency(amount: number, locale: 'ar' | 'en' = 'ar'): string {
  const formatted = roundToTwoDecimals(Number(amount) || 0).toLocaleString();
  return locale === 'ar' ? `${formatted} ريال` : `${formatted} SAR`;
}

/** تصنيف نوع الخدمة (للعرض/التوجيه). */
export function categorizeServiceType(serviceType: string | null | undefined): ServiceType {
  if (serviceType === 'training') return 'training';
  return 'services';
}

/** هل الخدمة مخفّضة (لإظهار شارة فقط — لا يؤثر على حسابات العمولة). */
export function isServiceDiscounted(
  serviceType: string | null | undefined,
  discountPercentage: number | null | undefined
): boolean {
  return serviceType === 'discount' || (discountPercentage != null && discountPercentage > 0);
}

/** تطبيق نسبة خصم بصرية على سعر معروض (لا علاقة له بالعمولة/الضريبة). */
export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number): number {
  const discountAmount = (originalPrice * discountPercentage) / 100;
  return roundToTwoDecimals(originalPrice - discountAmount);
}

export function calculateSavings(originalPrice: number, discountedPrice: number): number {
  return roundToTwoDecimals(originalPrice - discountedPrice);
}

export function isValidPrice(price: number | null | undefined): boolean {
  return price != null && price >= 0 && !isNaN(price);
}
