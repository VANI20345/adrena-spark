import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
}

export const useRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      onError,
      onSuccess
    } = options;

    setIsRetrying(true);
    setRetryCount(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await fn();
        setIsRetrying(false);
        setRetryCount(0);
        onSuccess?.();
        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        
        onError?.(error as Error, attempt);
        
        if (isLastAttempt) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        
        toast.info(`إعادة المحاولة ${attempt}/${maxAttempts} بعد ${Math.round(delay / 1000)} ثانية...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsRetrying(false);
    setRetryCount(0);
    throw new Error('فشل في جميع المحاولات');
  }, []);

  const retryWithExponentialBackoff = useCallback(async <T>(
    fn: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    return executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      ...customOptions
    });
  }, [executeWithRetry]);

  return {
    executeWithRetry,
    retryWithExponentialBackoff,
    isRetrying,
    retryCount
  };
};