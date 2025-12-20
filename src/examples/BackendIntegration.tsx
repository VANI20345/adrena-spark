import React, { useEffect, useState } from 'react';
import { loggerService } from '@/services/logger';
import { securityService } from '@/services/security';
import { cacheService } from '@/services/caching';
import { retryService } from '@/services/retry';

// Global Error Handler Setup
export const setupGlobalErrorHandling = () => {
  // Setup security monitoring
  const security = securityService;
  
  // Setup performance monitoring
  loggerService.info('Application started', { 
    version: '1.0.0',
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  });

  // Monitor API calls globally
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const startTime = Date.now();
    
    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;
      
      // Log API call
      loggerService.logAPICall(
        options?.method || 'GET',
        url.toString(),
        response.status,
        duration
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      loggerService.logAPICall(
        options?.method || 'GET',
        url.toString(),
        0,
        duration,
        { error: error.message }
      );
      throw error;
    }
  };
};

// Enhanced Auth Hook with Security
export const useSecureAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email: string, password: string) => {
    const userIdentifier = email.toLowerCase();
    
    // Check if user is locked out
    if (!securityService.checkAuthenticationAttempt(userIdentifier)) {
      throw new Error('Account temporarily locked due to multiple failed attempts');
    }

    // Sanitize inputs
    const sanitizedEmail = securityService.sanitizeInput(email, 'text');
    
    try {
      const response = await retryService.withRetry(
        async () => {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sanitizedEmail, password })
          });
          
          if (!res.ok) throw new Error('Authentication failed');
          return res.json();
        },
        { maxAttempts: 2, baseDelay: 1000 },
        'user_authentication'
      );

      // Clear failed attempts on success
      securityService.clearFailedAttempts(userIdentifier);
      
      // Validate JWT
      if (!securityService.validateJWT(response.token)) {
        throw new Error('Invalid authentication token');
      }

      setUser(response.user);
      setIsAuthenticated(true);
      
      // Cache user session for 24 hours
      await cacheService.set('user_session', {
        user: response.user,
        token: response.token,
        timestamp: Date.now()
      }, 86400000);

      loggerService.logUserAction('user_login', { userId: response.user.id });
      
    } catch (error) {
      // Record failed attempt
      securityService.recordFailedAuthentication(userIdentifier);
      loggerService.logException(error as Error, 'authentication_failed', { email: sanitizedEmail });
      throw error;
    }
  };

  const logout = async () => {
    try {
      loggerService.logUserAction('user_logout', { userId: user?.id });
      
      // Clear cached session
      await cacheService.delete('user_session');
      
      setUser(null);
      setIsAuthenticated(false);
      
    } catch (error) {
      loggerService.logException(error as Error, 'logout_failed');
    }
  };

  // Check session validity on app start
  useEffect(() => {
    const checkSession = async () => {
      try {
        const cachedSession = await cacheService.get<any>('user_session');
        
        if (cachedSession && securityService.validateSession(cachedSession)) {
          setUser(cachedSession.user);
          setIsAuthenticated(true);
          loggerService.info('Session restored from cache');
        }
      } catch (error) {
        loggerService.logException(error as Error, 'session_check_failed');
      }
    };

    checkSession();
  }, []);

  return { user, isAuthenticated, login, logout };
};

// Enhanced Data Fetching Hook
export const useSecureDataFetching = <T,>(
  endpoint: string,
  options: { 
    cacheKey?: string;
    cacheExpiryMinutes?: number;
    retryAttempts?: number;
    requireAuth?: boolean;
  } = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    cacheKey = endpoint,
    cacheExpiryMinutes = 30,
    retryAttempts = 3,
    requireAuth = false
  } = options;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedData = await cacheService.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      // Rate limiting check
      const userIdentifier = localStorage.getItem('user_id') || 'anonymous';
      if (!securityService.checkRateLimit(userIdentifier, 60, 60000)) { // 60 requests per minute
        throw new Error('Rate limit exceeded');
      }

      // Fetch with retry
      const result = await retryService.withRetry(
        async () => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          if (requireAuth) {
            const session = await cacheService.get<any>('user_session');
            if (!session?.token) throw new Error('Authentication required');
            headers.Authorization = `Bearer ${session.token}`;
          }

          const response = await fetch(endpoint, { headers });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return response.json();
        },
        { 
          maxAttempts: retryAttempts,
          baseDelay: 1000,
          retryCondition: (error) => 
            error.message.includes('network') || 
            error.message.includes('timeout') ||
            error.message.includes('500')
        },
        `api_fetch_${endpoint}`
      );

      // Cache successful response
      await cacheService.set(cacheKey, result, cacheExpiryMinutes * 60000);

      setData(result);
      loggerService.logPerformance(`data_fetch_${endpoint}`, Date.now());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      loggerService.logException(err as Error, 'data_fetching', { endpoint });
      
      // Try to get cached data as fallback
      const staleData = await cacheService.get<T>(cacheKey);
      if (staleData) {
        setData(staleData);
        loggerService.info('Using stale data as fallback', { endpoint });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
};

// Performance Monitoring Component
export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    const loadMetrics = async () => {
      const performanceData = await loggerService.getPerformanceMetrics();
      setMetrics(performanceData);
    };

    loadMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-semibold mb-2">Performance Metrics</h3>
      {metrics.slice(0, 5).map((metric: any, index) => (
        <div key={index} className="text-sm">
          {metric.operation}: {metric.duration}ms
        </div>
      ))}
    </div>
  );
};

// Security Status Component
export const SecurityStatus: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);

  useEffect(() => {
    const events = securityService.getSecurityEvents();
    setSecurityEvents(events.slice(0, 5)); // Show last 5 events
  }, []);

  return (
    <div className="p-4 bg-red-50 rounded">
      <h3 className="font-semibold mb-2">Security Status</h3>
      {securityEvents.length === 0 ? (
        <p className="text-sm text-green-600">No security events detected</p>
      ) : (
        securityEvents.map((event: any, index) => (
          <div key={index} className={`text-sm ${
            event.severity === 'critical' ? 'text-red-600' :
            event.severity === 'high' ? 'text-orange-600' :
            'text-yellow-600'
          }`}>
            {event.type}: {event.severity}
          </div>
        ))
      )}
    </div>
  );
};