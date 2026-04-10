import { toast } from 'sonner';
import { AppError, createError, handleError } from '@/utils/errorHandling';
import { loggerService } from '@/services/logger';

// Request/Response types for middleware
export interface RequestContext {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  userId?: string;
  timestamp: number;
}

export interface ResponseContext {
  status: number;
  statusText: string;
  data?: any;
  error?: Error;
  duration: number;
}

export interface MiddlewareContext {
  request: RequestContext;
  response?: ResponseContext;
  error?: Error;
  retryCount?: number;
  operationId: string;
}

// Middleware configuration
interface ErrorMiddlewareConfig {
  enableLogging: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableOfflineDetection: boolean;
  enableUserNotification: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class ErrorMiddleware {
  private config: ErrorMiddlewareConfig;
  private interceptors: {
    request: Array<(context: MiddlewareContext) => Promise<MiddlewareContext>>;
    response: Array<(context: MiddlewareContext) => Promise<MiddlewareContext>>;
    error: Array<(context: MiddlewareContext) => Promise<MiddlewareContext>>;
  };

  constructor(config: Partial<ErrorMiddlewareConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableOfflineDetection: true,
      enableUserNotification: true,
      logLevel: 'error',
      ...config
    };

    this.interceptors = {
      request: [],
      response: [],
      error: []
    };

    this.setupDefaultInterceptors();
  }

  // Add interceptors
  addRequestInterceptor(
    interceptor: (context: MiddlewareContext) => Promise<MiddlewareContext>
  ): void {
    this.interceptors.request.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (context: MiddlewareContext) => Promise<MiddlewareContext>
  ): void {
    this.interceptors.response.push(interceptor);
  }

  addErrorInterceptor(
    interceptor: (context: MiddlewareContext) => Promise<MiddlewareContext>
  ): void {
    this.interceptors.error.push(interceptor);
  }

  // Main middleware function
  async processRequest<T>(
    requestFn: () => Promise<T>,
    context: Partial<RequestContext> = {}
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    let middlewareContext: MiddlewareContext = {
      request: {
        url: context.url || 'unknown',
        method: context.method || 'GET',
        headers: context.headers,
        body: context.body,
        userId: context.userId,
        timestamp: startTime
      },
      operationId,
      retryCount: 0
    };

    try {
      // Process request interceptors
      middlewareContext = await this.runInterceptors('request', middlewareContext);

      // Execute the request
      const result = await requestFn();
      
      // Create response context
      middlewareContext.response = {
        status: 200,
        statusText: 'OK',
        data: result,
        duration: Date.now() - startTime
      };

      // Process response interceptors
      middlewareContext = await this.runInterceptors('response', middlewareContext);

      return result;
    } catch (error) {
      middlewareContext.error = error as Error;
      middlewareContext.response = {
        status: this.getErrorStatus(error),
        statusText: this.getErrorStatusText(error),
        error: error as Error,
        duration: Date.now() - startTime
      };

      // Process error interceptors
      middlewareContext = await this.runInterceptors('error', middlewareContext);

      // Re-throw the error after processing
      throw error;
    }
  }

  // Setup default interceptors
  private setupDefaultInterceptors(): void {
    // Request logging interceptor
    if (this.config.enableLogging) {
      this.addRequestInterceptor(async (context) => {
        loggerService.info('API Request Started', {
          operationId: context.operationId,
          url: context.request.url,
          method: context.request.method,
          userId: context.request.userId
        });
        return context;
      });
    }

    // Response logging interceptor
    if (this.config.enableLogging) {
      this.addResponseInterceptor(async (context) => {
        if (context.response) {
          loggerService.info('API Request Completed', {
            operationId: context.operationId,
            status: context.response.status,
            duration: context.response.duration
          });
        }
        return context;
      });
    }

    // Error handling interceptor
    this.addErrorInterceptor(async (context) => {
      if (context.error) {
        // Log the error
        if (this.config.enableLogging) {
          loggerService.error('API Request Failed', {
            operationId: context.operationId,
            error: context.error.message,
            stack: context.error.stack,
            url: context.request.url,
            method: context.request.method,
            userId: context.request.userId,
            duration: context.response?.duration
          });
        }

        // Check if it's a network error and we're offline
        if (this.config.enableOfflineDetection && this.isNetworkError(context.error)) {
          if (!navigator.onLine) {
            if (this.config.enableUserNotification) {
              toast.error('لا يوجد اتصال بالإنترنت');
            }
          }
        }

        // Handle specific error types
        await this.handleSpecificErrors(context);

        // User notification
        if (this.config.enableUserNotification) {
          this.notifyUser(context);
        }
      }
      return context;
    });

    // Rate limiting interceptor
    this.addRequestInterceptor(async (context) => {
      // Simple rate limiting check
      if (this.isRateLimited(context.request.url)) {
        throw createError('طلبات كثيرة جداً، يرجى المحاولة لاحقاً', 'RATE_LIMITED', 429);
      }
      return context;
    });

    // Authentication interceptor
    this.addErrorInterceptor(async (context) => {
      if (context.error && this.isAuthError(context.error)) {
        // Handle authentication errors
        this.handleAuthError(context);
      }
      return context;
    });
  }

  // Run interceptors for a specific phase
  private async runInterceptors(
    phase: 'request' | 'response' | 'error',
    context: MiddlewareContext
  ): Promise<MiddlewareContext> {
    let currentContext = context;
    
    for (const interceptor of this.interceptors[phase]) {
      try {
        currentContext = await interceptor(currentContext);
      } catch (interceptorError) {
        loggerService.error(`Error in ${phase} interceptor`, {
          operationId: context.operationId,
          error: interceptorError
        });
      }
    }
    
    return currentContext;
  }

  // Handle specific error types
  private async handleSpecificErrors(context: MiddlewareContext): Promise<void> {
    if (!context.error) return;

    const error = context.error;

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      loggerService.warn('Request timeout detected', {
        operationId: context.operationId,
        url: context.request.url
      });
    }

    // Handle server errors (5xx)
    if (this.isServerError(error)) {
      loggerService.error('Server error detected', {
        operationId: context.operationId,
        url: context.request.url,
        status: context.response?.status
      });
    }

    // Handle validation errors (4xx)
    if (this.isValidationError(error)) {
      loggerService.warn('Validation error detected', {
        operationId: context.operationId,
        url: context.request.url,
        body: context.request.body
      });
    }
  }

  // User notification based on error type
  private notifyUser(context: MiddlewareContext): void {
    if (!context.error) return;

    const error = context.error;
    
    if (this.isNetworkError(error)) {
      toast.error('خطأ في الاتصال بالشبكة');
    } else if (this.isAuthError(error)) {
      toast.error('انتهت صلاحية تسجيل الدخول');
    } else if (this.isServerError(error)) {
      toast.error('خطأ في الخادم، يرجى المحاولة لاحقاً');
    } else if (this.isValidationError(error)) {
      toast.error('بيانات غير صحيحة');
    } else {
      // Use the existing error handler
      handleError(error, `Operation ${context.operationId}`);
    }
  }

  // Handle authentication errors
  private handleAuthError(context: MiddlewareContext): void {
    // Clear stored tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/auth')) {
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    }
  }

  // Error type detection methods
  private isNetworkError(error: Error): boolean {
    const networkErrors = ['NetworkError', 'TypeError', 'Failed to fetch'];
    return networkErrors.some(type => 
      error.name === type || error.message.includes(type)
    );
  }

  private isTimeoutError(error: Error): boolean {
    return error.message.includes('timeout') || error.name === 'TimeoutError';
  }

  private isServerError(error: Error): boolean {
    const appError = error as AppError;
    return appError.status ? appError.status >= 500 : false;
  }

  private isValidationError(error: Error): boolean {
    const appError = error as AppError;
    return appError.status ? appError.status >= 400 && appError.status < 500 : false;
  }

  private isAuthError(error: Error): boolean {
    const appError = error as AppError;
    return appError.status === 401 || 
           appError.code === 'UNAUTHORIZED' ||
           error.message.includes('unauthorized');
  }

  private getErrorStatus(error: unknown): number {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as AppError).status || 500;
    }
    return 500;
  }

  private getErrorStatusText(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as Error).message || 'Unknown Error';
    }
    return 'Unknown Error';
  }

  private generateOperationId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Simple rate limiting check (can be enhanced)
  private isRateLimited(url: string): boolean {
    const key = `rate_limit_${url}`;
    const now = Date.now();
    const limit = 10; // 10 requests per minute
    const window = 60000; // 1 minute

    const requests = JSON.parse(localStorage.getItem(key) || '[]');
    const recentRequests = requests.filter((time: number) => now - time < window);
    
    if (recentRequests.length >= limit) {
      return true;
    }

    recentRequests.push(now);
    localStorage.setItem(key, JSON.stringify(recentRequests));
    return false;
  }
}

// Export singleton instance
export const errorMiddleware = new ErrorMiddleware();

// Convenience wrapper for API calls
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  context?: Partial<RequestContext>
): Promise<T> => {
  return errorMiddleware.processRequest(apiCall, context);
};