import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useCommissionRates — READ-ONLY DISPLAY
 *
 * يقرأ نسب العمولة المعلنة من system_settings فقط للعرض في صفحات مثل /terms.
 * ⚠️ لا تستخدم هذه النسب لأي حساب مالي على الفرونت.
 *    العمولة تُحسب في DB/edge functions حصراً.
 */
export interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

const DEFAULT_RATES: CommissionRates = { events: 10, services: 10, training: 10 };

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

      const next = { ...DEFAULT_RATES };
      (data || []).forEach((item: any) => {
        const v = typeof item.value === 'object' && item.value !== null
          ? (item.value as { percentage?: number }).percentage
          : item.value;
        const pct = Number(v);
        if (!Number.isFinite(pct)) return;
        if (item.key === 'commission_events') next.events = pct;
        if (item.key === 'commission_services') next.services = pct;
        if (item.key === 'commission_training') next.training = pct;
      });
      setRates(next);
      setError(null);
    } catch (err) {
      console.error('Error fetching commission rates:', err);
      setError('Failed to load commission rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  return { rates, loading, error, refetch: fetchRates };
};
