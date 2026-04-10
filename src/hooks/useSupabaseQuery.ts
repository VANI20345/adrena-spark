import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseSupabaseQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  staleTime?: number;
}

// Simple in-memory cache for query deduplication
const queryCache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();

export const useSupabaseQuery = ({ 
  queryKey, 
  queryFn, 
  enabled = true, 
  onSuccess, 
  onError,
  staleTime = 30000 // 30 seconds default
}: UseSupabaseQueryOptions) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { toast } = useToast();
  
  // Memoize queryFn to prevent unnecessary re-creations
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const refetch = useCallback(async (force = false) => {
    if (!enabled) return;
    
    const cacheKey = JSON.stringify(queryKey);
    const cached = queryCache.get(cacheKey);
    
    // Return cached data if still fresh and not forced
    if (!force && cached && Date.now() - cached.timestamp < staleTime) {
      setData(cached.data);
      setIsLoading(false);
      return cached.data;
    }
    
    // If there's an ongoing request, wait for it
    if (cached?.promise) {
      try {
        const result = await cached.promise;
        return result;
      } catch (err) {
        // Will be handled below
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    const fetchPromise = (async () => {
      try {
        const result = await queryFnRef.current();
        
        if (result?.error) {
          throw new Error(result.error.message || 'حدث خطأ في تحميل البيانات');
        }
        
        const resultData = result?.data || result;
        
        // Cache the result
        queryCache.set(cacheKey, {
          data: resultData,
          timestamp: Date.now()
        });
        
        setData(resultData);
        onSuccess?.(resultData);
        return resultData;
      } catch (err) {
        const errorObj = err as Error;
        setError(errorObj);
        onError?.(errorObj);
        
        toast({
          title: 'خطأ في تحميل البيانات',
          description: errorObj.message,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
        // Clear promise from cache
        const cached = queryCache.get(cacheKey);
        if (cached) {
          queryCache.set(cacheKey, { data: cached.data, timestamp: cached.timestamp });
        }
      }
    })();
    
    // Store the promise in cache for deduplication
    const cached2 = queryCache.get(cacheKey);
    queryCache.set(cacheKey, {
      data: cached2?.data,
      timestamp: cached2?.timestamp || Date.now(),
      promise: fetchPromise
    });
    
    return fetchPromise;
  }, [queryKey, enabled, onSuccess, onError, toast, staleTime]);

  useEffect(() => {
    if (!enabled) return;
    
    refetch();
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
      
      // Check if result exists and has error
      if (result && result.error) {
        throw new Error(result.error.message || 'حدث خطأ في العملية');
      }
      
      onSuccess?.(result?.data ?? null, variables);
      return result?.data ?? null;
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