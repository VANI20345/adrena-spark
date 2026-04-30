import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

const DEFAULT_RATES: CommissionRates = {
  events: 10,
  services: 10,
  training: 10,
};

export const useCommissionRates = () => {
  const [rates, setRates] = useState<CommissionRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['commission_events', 'commission_services', 'commission_training']);

      if (error) throw error;

      const newRates = { ...DEFAULT_RATES };
      
      if (data) {
        data.forEach((item) => {
          const value = typeof item.value === 'object' && item.value !== null
            ? (item.value as { percentage?: number }).percentage
            : item.value;
          
          const percentage = Number(value) || DEFAULT_RATES[item.key.replace('commission_', '') as keyof CommissionRates];
          
          if (item.key === 'commission_events') newRates.events = percentage;
          if (item.key === 'commission_services') newRates.services = percentage;
          if (item.key === 'commission_training') newRates.training = percentage;
        });
      }

      setRates(newRates);
      setError(null);
    } catch (err) {
      console.error('Error fetching commission rates:', err);
      setError('Failed to load commission rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Calculate commission for a given amount and type
  const calculateCommission = useCallback(
    (amount: number, type: 'events' | 'services' | 'training', isDiscounted: boolean = false): number => {
      // Discounted services are ALWAYS exempt from commission
      if (type === 'services' && isDiscounted) {
        return 0;
      }
      return (amount * rates[type]) / 100;
    },
    [rates]
  );

  // Calculate provider earnings after commission
  const calculateProviderEarnings = useCallback(
    (amount: number, type: 'events' | 'services' | 'training', isDiscounted: boolean = false): number => {
      const commission = calculateCommission(amount, type, isDiscounted);
      return amount - commission;
    },
    [calculateCommission]
  );

  return {
    rates,
    loading,
    error,
    refetch: fetchRates,
    calculateCommission,
    calculateProviderEarnings,
  };
};

// Standalone function to fetch commission rates (for edge functions and non-React contexts)
export const getCommissionRates = async (): Promise<CommissionRates> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['commission_events', 'commission_services', 'commission_training']);

    if (error) throw error;

    const rates = { ...DEFAULT_RATES };
    
    if (data) {
      data.forEach((item) => {
        const value = typeof item.value === 'object' && item.value !== null
          ? (item.value as { percentage?: number }).percentage
          : item.value;
        
        const percentage = Number(value) || DEFAULT_RATES[item.key.replace('commission_', '') as keyof CommissionRates];
        
        if (item.key === 'commission_events') rates.events = percentage;
        if (item.key === 'commission_services') rates.services = percentage;
        if (item.key === 'commission_training') rates.training = percentage;
      });
    }

    return rates;
  } catch (err) {
    console.error('Error fetching commission rates:', err);
    return DEFAULT_RATES;
  }
};
