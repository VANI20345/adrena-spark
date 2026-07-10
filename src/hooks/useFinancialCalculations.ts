/**
 * useFinancialCalculations — FORMATTERS ONLY
 *
 * ⚠️ لا تُجري هذه الـ hook أي حساب مالي حقيقي.
 *   - لا commission, لا VAT, لا provider_earnings.
 *   - استخدمها فقط لتنسيق الأرقام القادمة من DB.
 *
 * المصدر الوحيد للأرقام المالية: جداول DB (bookings, service_bookings,
 * payment_holds, platform_invoices) و RPCs.
 */
import { formatCurrency, roundToTwoDecimals } from '@/utils/financialCalculations';

export function useFinancialCalculations() {
  return {
    formatCurrency,
    roundToTwoDecimals,
  };
}
