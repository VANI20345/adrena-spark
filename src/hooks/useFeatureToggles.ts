import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FeatureKey = 'groups' | 'services' | 'trainings' | 'discounts' | 'provider_signup';

export type FeatureToggles = Record<FeatureKey, boolean>;

const DEFAULTS: FeatureToggles = {
  groups: true,
  services: true,
  trainings: true,
  discounts: true,
  provider_signup: true,
};


export const useFeatureToggles = () => {
  const query = useQuery({
    queryKey: ['system-settings', 'feature_toggles'],
    queryFn: async (): Promise<FeatureToggles> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'feature_toggles')
        .maybeSingle();
      if (error) throw error;
      const value = (data?.value as Partial<FeatureToggles>) || {};
      return { ...DEFAULTS, ...value };
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`feature-toggles-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.feature_toggles',
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    toggles: query.data || DEFAULTS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const useFeatureEnabled = (key: FeatureKey) => {
  const { toggles, isLoading } = useFeatureToggles();
  return { enabled: toggles[key], isLoading };
};