import { useCallback, useMemo } from 'react';
import { useCommissionRates } from './useCommissionRates';
import {
  calculateFinancialBreakdown,
  extractVatFromInclusive,
  formatCurrency,
  isServiceDiscounted,
  categorizeServiceType,
  roundToTwoDecimals,
  type FinancialBreakdown,
  type ServiceType,
} from '@/utils/financialCalculations';

/**
 * Hook for financial calculations with commission rates from database
 * 
 * This hook provides a unified interface for all financial calculations
 * across the application, ensuring consistency everywhere.
 */
export function useFinancialCalculations() {
  const { rates, loading, error, refetch } = useCommissionRates();

  /**
   * Calculate the complete financial breakdown for a booking
   */
  const calculateBreakdown = useCallback(
    (
      totalAmount: number,
      serviceType: string | null | undefined,
      discountPercentage?: number | null
    ): FinancialBreakdown => {
      const type = categorizeServiceType(serviceType);
      const isDiscounted = isServiceDiscounted(serviceType, discountPercentage);
      
      // Get the commission rate based on service type
      let commissionRate = 0;
      if (!isDiscounted) {
        commissionRate = type === 'training' ? rates.training : rates.services;
      }

      return calculateFinancialBreakdown(totalAmount, commissionRate, isDiscounted);
    },
    [rates]
  );

  /**
   * Calculate event financial breakdown
   */
  const calculateEventBreakdown = useCallback(
    (totalAmount: number): FinancialBreakdown => {
      return calculateFinancialBreakdown(totalAmount, rates.events, false);
    },
    [rates]
  );

  /**
   * Get provider earnings for display
   */
  const getProviderEarnings = useCallback(
    (
      totalAmount: number,
      serviceType: string | null | undefined,
      discountPercentage?: number | null
    ): number => {
      const breakdown = calculateBreakdown(totalAmount, serviceType, discountPercentage);
      return breakdown.providerEarnings;
    },
    [calculateBreakdown]
  );

  /**
   * Get platform commission for display
   */
  const getPlatformCommission = useCallback(
    (
      totalAmount: number,
      serviceType: string | null | undefined,
      discountPercentage?: number | null
    ): number => {
      const breakdown = calculateBreakdown(totalAmount, serviceType, discountPercentage);
      return breakdown.platformCommission;
    },
    [calculateBreakdown]
  );

  /**
   * Format financial breakdown for display
   */
  const formatBreakdownForDisplay = useCallback(
    (breakdown: FinancialBreakdown, locale: 'ar' | 'en' = 'ar') => {
      return {
        totalAmount: formatCurrency(breakdown.totalAmount, locale),
        platformCommission: formatCurrency(breakdown.platformCommission, locale),
        vatOnCommission: formatCurrency(breakdown.vatOnCommission, locale),
        providerEarnings: formatCurrency(breakdown.providerEarnings, locale),
        commissionRateDisplay: `${breakdown.commissionRate}%`,
      };
    },
    []
  );

  return {
    // Commission rates
    rates,
    loading,
    error,
    refetch,

    // Calculation functions
    calculateBreakdown,
    calculateEventBreakdown,
    getProviderEarnings,
    getPlatformCommission,
    formatBreakdownForDisplay,

    // Utility exports
    extractVatFromInclusive,
    formatCurrency,
    roundToTwoDecimals,
  };
}
