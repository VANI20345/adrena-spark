/**
 * Centralized Financial Calculations Module
 * 
 * IMPORTANT: This module implements the VAT-Inclusive Pricing Model
 * - All prices shown to users are FINAL (what they pay)
 * - VAT (15%) is included in the price, not added on top
 * - Commission is calculated from the total amount
 * - VAT on commission is extracted (not added) from the commission amount
 * 
 * Formula breakdown for a 100 SAR service with 15% commission:
 * - User pays: 100 SAR (final price)
 * - Platform commission: 15 SAR (15% of 100)
 * - VAT on commission: 1.96 SAR (15 / 1.15 * 0.15 = extracted from commission)
 * - Net commission to platform: 13.04 SAR (15 - 1.96)
 * - Provider receives: 85 SAR (100 - 15)
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
  /** The total amount paid by the user (VAT-inclusive) */
  totalAmount: number;
  /** Commission rate applied (percentage) */
  commissionRate: number;
  /** Platform commission amount (VAT-inclusive) */
  platformCommission: number;
  /** VAT extracted from the commission (not added) */
  vatOnCommission: number;
  /** Net commission after VAT extraction */
  netCommission: number;
  /** Amount the provider receives */
  providerEarnings: number;
  /** Whether this is a discounted service (0% commission) */
  isDiscounted: boolean;
}

/**
 * Calculate the complete financial breakdown for a transaction
 * 
 * @param totalAmount - The final price paid by the user (VAT-inclusive)
 * @param commissionRate - The commission percentage (e.g., 15 for 15%)
 * @param isDiscounted - Whether this is a discounted service (exempt from commission)
 * @returns Complete financial breakdown
 */
export function calculateFinancialBreakdown(
  totalAmount: number,
  commissionRate: number,
  isDiscounted: boolean = false
): FinancialBreakdown {
  // Discounted services are ALWAYS exempt from commission
  const effectiveCommissionRate = isDiscounted ? 0 : commissionRate;
  
  // Calculate platform commission
  const platformCommission = (totalAmount * effectiveCommissionRate) / 100;
  
  // Extract VAT from the commission (VAT is included in the commission, not added)
  // Formula: VAT = commission - (commission / 1.15)
  const vatOnCommission = platformCommission - (platformCommission / (1 + VAT_RATE));
  
  // Net commission is commission minus the VAT portion
  const netCommission = platformCommission - vatOnCommission;
  
  // Provider receives total minus platform commission
  const providerEarnings = totalAmount - platformCommission;
  
  return {
    totalAmount: roundToTwoDecimals(totalAmount),
    commissionRate: effectiveCommissionRate,
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
