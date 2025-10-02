import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseSupabaseQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useSupabaseQuery = ({ 
  queryKey, 
  queryFn, 
  enabled = true, 
  onSuccess, 
  onError 
}: UseSupabaseQueryOptions) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await queryFn();
      
      if (result?.error) {
        throw new Error(result.error.message || 'حدث خطأ في تحميل البيانات');
      }
      
      setData(result?.data || result);
      onSuccess?.(result?.data || result);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj);
      onError?.(errorObj);
      
      toast({
        title: 'خطأ في تحميل البيانات',
        description: errorObj.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled, onSuccess, onError, toast]);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await queryFn();
        
        if (result?.error) {
          throw new Error(result.error.message || 'حدث خطأ في تحميل البيانات');
        }
        
        setData(result?.data || result);
        onSuccess?.(result?.data || result);
      } catch (err) {
        const errorObj = err as Error;
        setError(errorObj);
        onError?.(errorObj);
        
        toast({
          title: 'خطأ في تحميل البيانات',
          description: errorObj.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [queryKey.join(','), enabled]); // Stable dependencies only

  return { data, isLoading, error, refetch };
}

export function useSupabaseMutation<T, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<{ data: T | null; error: any }>,
  options: {
    onSuccess?: (data: T | null, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const { onSuccess, onError } = options;

  const mutate = async (variables: TVariables) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await mutationFn(variables);
      
      if (result.error) {
        throw new Error(result.error.message || 'حدث خطأ في العملية');
      }
      
      onSuccess?.(result.data, variables);
      return result.data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error, variables);
      
      toast({
        title: 'خطأ في العملية',
        description: error.message,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}