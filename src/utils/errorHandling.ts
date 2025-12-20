import { toast } from 'sonner';

export interface AppError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

export const createError = (
  message: string, 
  code?: string, 
  status?: number, 
  details?: any
): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
};

export const handleError = (error: unknown, context?: string) => {
  console.error(`Error ${context ? `in ${context}` : ''}:`, error);
  
  let userMessage = 'حدث خطأ غير متوقع';
  
  if (error instanceof Error) {
    const appError = error as AppError;
    
    // Handle specific error types
    switch (appError.code) {
      case 'NETWORK_ERROR':
        userMessage = 'خطأ في الاتصال بالشبكة';
        break;
      case 'UNAUTHORIZED':
        userMessage = 'غير مخول للوصول';
        break;
      case 'FORBIDDEN':
        userMessage = 'الوصول مرفوض';
        break;
      case 'NOT_FOUND':
        userMessage = 'العنصر المطلوب غير موجود';
        break;
      case 'VALIDATION_ERROR':
        userMessage = 'بيانات غير صحيحة';
        break;
      case 'SERVER_ERROR':
        userMessage = 'خطأ في الخادم';
        break;
      default:
        userMessage = appError.message || userMessage;
    }
    
    // Handle HTTP status codes
    if (appError.status) {
      switch (appError.status) {
        case 400:
          userMessage = 'طلب غير صحيح';
          break;
        case 401:
          userMessage = 'يجب تسجيل الدخول أولاً';
          break;
        case 403:
          userMessage = 'الوصول مرفوض';
          break;
        case 404:
          userMessage = 'الصفحة غير موجودة';
          break;
        case 422:
          userMessage = 'بيانات غير صالحة';
          break;
        case 500:
          userMessage = 'خطأ في الخادم الداخلي';
          break;
        case 502:
          userMessage = 'خطأ في البوابة';
          break;
        case 503:
          userMessage = 'الخدمة غير متوفرة مؤقتاً';
          break;
      }
    }
  }
  
  // Show user-friendly error message
  toast.error(userMessage);
  
  // Report error to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    reportError(error, context);
  }
  
  return userMessage;
};

export const reportError = async (error: unknown, context?: string) => {
  try {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') // if you store user ID
    };
    
    // Send to your error reporting service
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData)
    });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

export const handleAsync = async <T>(
  promise: Promise<T>, 
  context?: string
): Promise<[T | null, AppError | null]> => {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const appError = error instanceof Error ? error as AppError : createError(String(error));
    handleError(appError, context);
    return [null, appError];
  }
};

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
};

// Supabase specific error handler
export const handleSupabaseError = (error: any, operation?: string) => {
  console.error(`Supabase error ${operation ? `during ${operation}` : ''}:`, error);
  
  let userMessage = 'حدث خطأ في قاعدة البيانات';
  
  if (error?.code) {
    switch (error.code) {
      case '23505': // unique_violation
        userMessage = 'البيانات موجودة مسبقاً';
        break;
      case '23503': // foreign_key_violation
        userMessage = 'لا يمكن تنفيذ العملية بسبب ارتباط البيانات';
        break;
      case '42501': // insufficient_privilege
        userMessage = 'صلاحيات غير كافية';
        break;
      case 'PGRST116': // No rows found
        userMessage = 'لا توجد بيانات';
        break;
      default:
        userMessage = error.message || userMessage;
    }
  }
  
  toast.error(userMessage);
  return userMessage;
};

// Validation helper
export const validateRequired = (fields: Record<string, any>): string[] => {
  const errors: string[] = [];
  
  Object.entries(fields).forEach(([key, value]) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${key} مطلوب`);
    }
  });
  
  return errors;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+966|0)?[5-9]\d{8}$/;
  return phoneRegex.test(phone);
};

export const showValidationErrors = (errors: string[]) => {
  errors.forEach(error => {
    toast.error(error);
  });
};