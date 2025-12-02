import { toast } from 'sonner';
import { loggerService } from './logger';

// Retry configuration interface
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onFallback?: () => Promise<any>;
  enableJitter: boolean;
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number;
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN', 
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private nextAttempt = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

export class RetryService {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    enableJitter: true,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx server errors
      if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
        return true;
      }
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
        return true;
      }
      return false;
    }
  };

  // Retry with exponential backoff
  async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName = 'unknown'
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        loggerService.debug(`Retry attempt ${attempt}/${finalConfig.maxAttempts}`, {
          operation: operationName,
          attempt
        });

        const result = await operation();
        
        if (attempt > 1) {
          loggerService.info('Operation succeeded after retry', {
            operation: operationName,
            attempt,
            totalAttempts: finalConfig.maxAttempts
          });
        }

        return result;
      } catch (error) {
        lastError = error;
        
        loggerService.warn('Operation failed, checking retry conditions', {
          operation: operationName,
          attempt,
          error: error.message,
          willRetry: attempt < finalConfig.maxAttempts && (finalConfig.retryCondition?.(error) ?? false)
        });

        // Check if we should retry
        if (attempt === finalConfig.maxAttempts || 
            (finalConfig.retryCondition && !finalConfig.retryCondition(error))) {
          break;
        }

        // Call onRetry callback if provided
        if (finalConfig.onRetry) {
          try {
            finalConfig.onRetry(attempt, error);
          } catch (callbackError) {
            loggerService.error('Error in retry callback', { error: callbackError });
          }
        }

        // Wait before retrying
        const delay = this.calculateDelay(attempt, finalConfig);
        await this.delay(delay);
      }
    }

    // All retries failed, try fallback if available
    if (finalConfig.onFallback) {
      try {
        loggerService.info('All retries failed, attempting fallback', {
          operation: operationName,
          attempts: finalConfig.maxAttempts
        });
        return await finalConfig.onFallback();
      } catch (fallbackError) {
        loggerService.error('Fallback also failed', {
          operation: operationName,
          originalError: lastError.message,
          fallbackError: fallbackError.message
        });
      }
    }

    loggerService.error('Operation failed after all retries', {
      operation: operationName,
      attempts: finalConfig.maxAttempts,
      finalError: lastError.message
    });

    throw lastError;
  }

  // Retry with circuit breaker
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig & CircuitBreakerConfig> = {}
  ): Promise<T> {
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000,
      ...config
    };

    let circuitBreaker = this.circuitBreakers.get(operationName);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
      this.circuitBreakers.set(operationName, circuitBreaker);
    }

    try {
      return await circuitBreaker.call(async () => {
        return await this.withRetry(operation, config, operationName);
      });
    } catch (error) {
      if (error.message === 'Circuit breaker is OPEN') {
        loggerService.warn('Circuit breaker is open', {
          operation: operationName,
          state: circuitBreaker.getState(),
          failures: circuitBreaker.getFailures()
        });
        toast.error('الخدمة غير متوفرة مؤقتاً، يرجى المحاولة لاحقاً');
      }
      throw error;
    }
  }

  // Critical payment operations with enhanced retry
  async retryPaymentOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.withCircuitBreaker(
      operation,
      `payment_${operationName}`,
      {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 15000,
        backoffMultiplier: 1.5,
        failureThreshold: 3,
        resetTimeout: 120000, // 2 minutes
        retryCondition: (error: any) => {
          // Don't retry on client errors (4xx except 408, 429)
          if (error.status >= 400 && error.status < 500) {
            return error.status === 408 || error.status === 429;
          }
          return true;
        },
        onRetry: (attempt, error) => {
          loggerService.error('Payment operation retry', {
            operation: operationName,
            attempt,
            error: error.message,
            userId: this.getCurrentUserId()
          });
          
          if (attempt === 2) {
            toast.warning('جاري إعادة المحاولة...');
          }
        },
        onFallback: async () => {
          loggerService.error('Payment operation failed completely', {
            operation: operationName,
            userId: this.getCurrentUserId()
          });
          
          toast.error('فشل في معالجة الدفع، يرجى المحاولة لاحقاً أو التواصل مع الدعم');
          throw new Error('Payment operation failed after all retries and fallback');
        }
      }
    );
  }

  // Critical notification operations with retry
  async retryNotificationOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.withCircuitBreaker(
      operation,
      `notification_${operationName}`,
      {
        maxAttempts: 4,
        baseDelay: 1500,
        maxDelay: 10000,
        backoffMultiplier: 2,
        failureThreshold: 4,
        resetTimeout: 90000, // 1.5 minutes
        retryCondition: (error: any) => {
          // Retry on network errors and server errors
          return error.status >= 500 || 
                 error.name === 'NetworkError' ||
                 error.message?.includes('timeout');
        },
        onRetry: (attempt, error) => {
          loggerService.warn('Notification operation retry', {
            operation: operationName,
            attempt,
            error: error.message
          });
        },
        onFallback: async () => {
          // Store notification for later retry
          await this.storeFailedNotification(operationName);
          loggerService.info('Notification stored for later retry', {
            operation: operationName
          });
          
          return { success: false, queued: true };
        }
      }
    );
  }

  // General API operations with retry
  async retryAPIOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    return this.withRetry(
      operation,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          loggerService.info('API operation retry', {
            operation: operationName,
            attempt,
            error: error.message
          });
          
          if (attempt >= 2) {
            toast.info('جاري إعادة المحاولة...');
          }
        },
        ...config
      },
      operationName
    );
  }

  // Bulk operation with partial failure handling
  async retryBulkOperation<T>(
    items: T[],
    operation: (item: T) => Promise<any>,
    operationName: string,
    options: {
      batchSize?: number;
      continueOnError?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<{ successful: T[]; failed: Array<{ item: T; error: any }> }> {
    const { batchSize = 10, continueOnError = true, maxConcurrent = 5 } = options;
    
    const successful: T[] = [];
    const failed: Array<{ item: T; error: any }> = [];

    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Limit concurrency within batch
      const chunks = this.chunkArray(batch, maxConcurrent);
      
      for (const chunk of chunks) {
        const promises = chunk.map(async (item) => {
          try {
            await this.withRetry(
              () => operation(item),
              { maxAttempts: 2 },
              `${operationName}_item`
            );
            return { success: true, item };
          } catch (error) {
            return { success: false, item, error };
          }
        });

        const results = await Promise.all(promises);
        
        results.forEach((result) => {
          if (result.success) {
            successful.push(result.item);
          } else {
            failed.push({ item: result.item, error: result.error });
            
            if (!continueOnError) {
              throw new Error(`Bulk operation failed on item: ${JSON.stringify(result.item)}`);
            }
          }
        });
      }
    }

    loggerService.info('Bulk operation completed', {
      operation: operationName,
      total: items.length,
      successful: successful.length,
      failed: failed.length
    });

    return { successful, failed };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(operationName: string): {
    state: CircuitState;
    failures: number;
  } | null {
    const circuitBreaker = this.circuitBreakers.get(operationName);
    if (!circuitBreaker) return null;

    return {
      state: circuitBreaker.getState(),
      failures: circuitBreaker.getFailures()
    };
  }

  // Reset circuit breaker
  resetCircuitBreaker(operationName: string): void {
    this.circuitBreakers.delete(operationName);
  }

  // Private helper methods
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.enableJitter) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay += jitter;
    }
    
    return Math.max(delay, 0);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async storeFailedNotification(operationName: string): Promise<void> {
    try {
      const stored = localStorage.getItem('failed_notifications');
      const failed = stored ? JSON.parse(stored) : [];
      
      failed.push({
        operation: operationName,
        timestamp: Date.now(),
        retryAfter: Date.now() + 300000 // Retry after 5 minutes
      });
      
      localStorage.setItem('failed_notifications', JSON.stringify(failed));
    } catch (error) {
      loggerService.error('Failed to store failed notification', { error });
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }
}

// Export singleton instance
export const retryService = new RetryService();