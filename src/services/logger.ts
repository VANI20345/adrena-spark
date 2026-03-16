interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: number;
  sessionId: string;
  userId?: string;
  url: string;
  userAgent: string;
  stackTrace?: string;
}

interface LoggerConfig {
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  batchSize: number;
  flushInterval: number; // milliseconds
}

export class LoggerService {
  private config: LoggerConfig;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private storage = {
    logs: 'hawaya_logs',
    errors: 'hawaya_errors',
    performance: 'hawaya_performance'
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsole: true,
      enableStorage: true,
      enableRemote: process.env.NODE_ENV === 'production',
      maxStorageEntries: 1000,
      remoteEndpoint: '/api/logs',
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupFlushTimer();
    this.setupPerformanceMonitoring();
    this.setupUnhandledErrorLogging();
  }

  // Main logging methods
  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.log('info', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, data);
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      this.log('error', message, data, new Error().stack);
    }
  }

  // Exception logging with context
  logException(error: Error, context?: string, additionalData?: any): void {
    const logData = {
      context,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...additionalData
    };

    this.error(`Exception: ${error.message}`, logData);
    
    // Store critical errors separately
    this.storeException(error, context, additionalData);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, additionalData?: any): void {
    const perfData = {
      operation,
      duration,
      timestamp: Date.now(),
      ...additionalData
    };

    this.info(`Performance: ${operation}`, perfData);
    this.storePerformanceMetric(perfData);
  }

  // User action logging
  logUserAction(action: string, data?: any): void {
    this.info(`User Action: ${action}`, {
      action,
      userId: this.getCurrentUserId(),
      ...data
    });
  }

  // API call logging
  logAPICall(method: string, url: string, status: number, duration: number, data?: any): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    this[level](`API ${method} ${url}`, {
      method,
      url,
      status,
      duration,
      ...data
    });
  }

  // Security event logging
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', data?: any): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    this[level](`Security Event: ${event}`, {
      event,
      severity,
      userId: this.getCurrentUserId(),
      ...data
    });

    // Immediately flush security events
    if (severity === 'high') {
      this.flush();
    }
  }

  // Get logs for debugging
  async getLogs(
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit: number = 100
  ): Promise<LogEntry[]> {
    try {
      const stored = localStorage.getItem(this.storage.logs);
      if (!stored) return [];

      const logs: LogEntry[] = JSON.parse(stored);
      
      return logs
        .filter(log => !level || log.level === level)
        .slice(-limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return [];
    }
  }

  // Get error logs
  async getErrorLogs(limit: number = 50): Promise<LogEntry[]> {
    try {
      const stored = localStorage.getItem(this.storage.errors);
      if (!stored) return [];

      const errors: LogEntry[] = JSON.parse(stored);
      
      return errors
        .slice(-limit)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error retrieving error logs:', error);
      return [];
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(operation?: string): Promise<any[]> {
    try {
      const stored = localStorage.getItem(this.storage.performance);
      if (!stored) return [];

      const metrics = JSON.parse(stored);
      
      return operation 
        ? metrics.filter((m: any) => m.operation === operation)
        : metrics;
    } catch (error) {
      console.error('Error retrieving performance metrics:', error);
      return [];
    }
  }

  // Clear logs
  clearLogs(): void {
    localStorage.removeItem(this.storage.logs);
    localStorage.removeItem(this.storage.errors);
    localStorage.removeItem(this.storage.performance);
    this.logBuffer = [];
  }

  // Flush logs to remote endpoint
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.enableRemote) {
      return;
    }

    try {
      const logs = [...this.logBuffer];
      this.logBuffer = [];

      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        // Put logs back if failed
        this.logBuffer.unshift(...logs);
        throw new Error(`Failed to flush logs: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  // Export logs for debugging
  exportLogs(): string {
    const allLogs = {
      logs: this.getLogs(),
      errors: this.getErrorLogs(),
      performance: this.getPerformanceMetrics(),
      session: this.sessionId,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(allLogs, null, 2);
  }

  // Private methods
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any,
    stackTrace?: string
  ): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace
    };

    // Console logging
    if (this.config.enableConsole) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.storeLog(entry);
    }

    // Buffer for remote logging
    if (this.config.enableRemote) {
      this.logBuffer.push(entry);
      
      if (this.logBuffer.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex >= configLevelIndex;
  }

  private storeLog(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem(this.storage.logs);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxStorageEntries) {
        logs.splice(0, logs.length - this.config.maxStorageEntries);
      }
      
      localStorage.setItem(this.storage.logs, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  private storeException(error: Error, context?: string, additionalData?: any): void {
    try {
      const stored = localStorage.getItem(this.storage.errors);
      const errors: any[] = stored ? JSON.parse(stored) : [];
      
      const errorEntry = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context,
        additionalData,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.getCurrentUserId(),
        url: window.location.href
      };
      
      errors.push(errorEntry);
      
      // Keep only recent errors
      if (errors.length > 100) {
        errors.splice(0, errors.length - 100);
      }
      
      localStorage.setItem(this.storage.errors, JSON.stringify(errors));
    } catch (storeError) {
      console.error('Failed to store exception:', storeError);
    }
  }

  private storePerformanceMetric(metric: any): void {
    try {
      const stored = localStorage.getItem(this.storage.performance);
      const metrics: any[] = stored ? JSON.parse(stored) : [];
      
      metrics.push(metric);
      
      // Keep only recent metrics
      if (metrics.length > 500) {
        metrics.splice(0, metrics.length - 500);
      }
      
      localStorage.setItem(this.storage.performance, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Try to get user ID from localStorage or your auth system
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }

  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          this.logPerformance('page_load', perfData.loadEventEnd - perfData.loadEventStart, {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            firstPaint: perfData.responseEnd - perfData.requestStart
          });
        }
      }, 1000);
    });

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        // PerformanceObserver not supported or error in setup
      }
    }
  }

  private setupUnhandledErrorLogging(): void {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logException(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'unhandled_promise_rejection'
      );
    });

    // Catch uncaught errors
    window.addEventListener('error', (event) => {
      this.logException(
        event.error || new Error(event.message),
        'uncaught_error',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });
  }
}

// Export singleton instance
export const loggerService = new LoggerService();
