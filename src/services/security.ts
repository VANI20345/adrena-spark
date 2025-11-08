import { loggerService } from './logger';
import { toast } from 'sonner';

interface SecurityConfig {
  enableCSP: boolean;
  enableIntegrityChecks: boolean;
  enableRateLimiting: boolean;
  enableInputSanitization: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // milliseconds
  sessionTimeout: number; // milliseconds
}

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'xss_attempt' | 'injection_attempt' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export class SecurityService {
  private config: SecurityConfig;
  private failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private rateLimits = new Map<string, { requests: number[]; }>();
  private suspiciousActivities = new Set<string>();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableIntegrityChecks: true,
      enableRateLimiting: true,
      enableInputSanitization: true,
      maxFailedAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.setupSecurityHeaders();
    this.setupEventListeners();
  }

  // Input sanitization
  sanitizeInput(input: string, type: 'text' | 'html' | 'sql' | 'url' = 'text'): string {
    if (!this.config.enableInputSanitization) return input;

    let sanitized = input;

    switch (type) {
      case 'html':
        sanitized = this.sanitizeHTML(input);
        break;
      case 'sql':
        sanitized = this.sanitizeSQL(input);
        break;
      case 'url':
        sanitized = this.sanitizeURL(input);
        break;
      default:
        sanitized = this.sanitizeText(input);
    }

    // Check for potential XSS
    if (this.detectXSS(input)) {
      this.logSecurityEvent({
        type: 'xss_attempt',
        severity: 'high',
        details: { originalInput: input, sanitizedInput: sanitized }
      });
    }

    // Check for SQL injection attempts
    if (this.detectSQLInjection(input)) {
      this.logSecurityEvent({
        type: 'injection_attempt',
        severity: 'critical',
        details: { input, type: 'sql' }
      });
    }

    return sanitized;
  }

  // Rate limiting
  checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    if (!this.config.enableRateLimiting) return true;

    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.rateLimits.has(identifier)) {
      this.rateLimits.set(identifier, { requests: [] });
    }

    const limits = this.rateLimits.get(identifier)!;
    
    // Remove old requests outside the window
    limits.requests = limits.requests.filter(time => time > windowStart);
    
    if (limits.requests.length >= maxRequests) {
      this.logSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        details: { identifier, requests: limits.requests.length, maxRequests, windowMs }
      });
      return false;
    }

    limits.requests.push(now);
    return true;
  }

  // Authentication security
  checkAuthenticationAttempt(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier);

    if (attempts) {
      // Check if lockout period has expired
      if (now - attempts.lastAttempt > this.config.lockoutDuration) {
        this.failedAttempts.delete(identifier);
        return true;
      }

      // Check if too many failed attempts
      if (attempts.count >= this.config.maxFailedAttempts) {
        this.logSecurityEvent({
          type: 'auth_failure',
          severity: 'high',
          details: { identifier, attempts: attempts.count, locked: true }
        });
        return false;
      }
    }

    return true;
  }

  recordFailedAuthentication(identifier: string): void {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    this.failedAttempts.set(identifier, attempts);

    this.logSecurityEvent({
      type: 'auth_failure',
      severity: attempts.count >= 3 ? 'high' : 'medium',
      details: { identifier, attempts: attempts.count }
    });

    if (attempts.count >= this.config.maxFailedAttempts) {
      toast.error(`تم قفل الحساب لمدة ${this.config.lockoutDuration / 60000} دقيقة بسبب المحاولات المتعددة`);
    }
  }

  clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  // Session security
  validateSession(sessionData: any): boolean {
    if (!sessionData || !sessionData.timestamp) return false;

    const now = Date.now();
    const sessionAge = now - sessionData.timestamp;

    if (sessionAge > this.config.sessionTimeout) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: { reason: 'expired_session', sessionAge }
      });
      return false;
    }

    return true;
  }

  // Token validation
  validateJWT(token: string): boolean {
    try {
      // Basic JWT validation (in real app, use proper JWT library)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;

      if (payload.exp && payload.exp < now) {
        return false;
      }

      return true;
    } catch (error) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: { reason: 'invalid_jwt', error: error.message }
      });
      return false;
    }
  }

  // Content Security Policy
  setupCSP(): void {
    if (!this.config.enableCSP) return;

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://*.supabase.co`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https: http:`,
      `connect-src 'self' https://*.supabase.co https://api.mapbox.com wss:`,
      `media-src 'self' blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`
    ].join('; ');

    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Security-Policy';
    metaTag.content = csp;
    document.head.appendChild(metaTag);
  }

  // Suspicious activity detection
  detectSuspiciousActivity(activity: any): boolean {
    const patterns = [
      // Multiple failed login attempts
      { pattern: /login.*fail/i, weight: 3 },
      // Unusual API access patterns
      { pattern: /api.*unauthorized/i, weight: 2 },
      // Admin endpoint access
      { pattern: /admin/i, weight: 4 },
      // Brute force patterns
      { pattern: /brute.*force/i, weight: 5 }
    ];

    let suspiciousScore = 0;
    const activityString = JSON.stringify(activity).toLowerCase();

    patterns.forEach(({ pattern, weight }) => {
      if (pattern.test(activityString)) {
        suspiciousScore += weight;
      }
    });

    if (suspiciousScore >= 5) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'critical',
        details: { activity, suspiciousScore }
      });
      return true;
    }

    return false;
  }

  // Security headers setup
  private setupSecurityHeaders(): void {
    // These would typically be set by the server, but we can add some client-side security measures
    
    // Prevent clickjacking
    if (window.top !== window.self) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        details: { reason: 'potential_clickjacking' }
      });
    }

    // Setup CSP
    this.setupCSP();
  }

  // Event listeners for security monitoring
  private setupEventListeners(): void {
    // Monitor for developer tools opening (basic detection)
    let devtools = {open: false, orientation: null};
    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'low',
            details: { reason: 'devtools_opened' }
          });
        }
      } else {
        devtools.open = false;
      }
    }, 500);

    // Monitor for unusual mouse/keyboard activity
    let clickCount = 0;
    let keyPressCount = 0;
    
    document.addEventListener('click', () => {
      clickCount++;
    });

    document.addEventListener('keypress', () => {
      keyPressCount++;
    });

    // Check for bot-like behavior every minute
    setInterval(() => {
      if (clickCount > 100 || keyPressCount > 500) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          details: { 
            reason: 'unusual_activity',
            clicks: clickCount,
            keypresses: keyPressCount
          }
        });
      }
      clickCount = 0;
      keyPressCount = 0;
    }, 60000);
  }

  // Input sanitization methods
  private sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  private sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  private sanitizeSQL(input: string): string {
    return input
      .replace(/[';]|--/g, '')
      .replace(/\b(union|select|insert|update|delete|drop|create|alter)\b/gi, '')
      .trim();
  }

  private sanitizeURL(input: string): string {
    try {
      const url = new URL(input);
      return url.toString();
    } catch {
      return '';
    }
  }

  // Threat detection methods
  private detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /expression\(/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|into|values|set|table)\b)/i,
      /(['"`])(.*)(union|select|insert|update|delete)(.*)(['"`])/i,
      /;\s*(drop|delete|truncate|update|insert)/i,
      /\b(or|and)\s+\d+\s*=\s*\d+/i,
      /'\s+(or|and)\s+'/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Security event logging
  private logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'userId' | 'ip' | 'userAgent'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      ip: 'unknown', // Would be set by server
      userAgent: navigator.userAgent
    };

    loggerService.logSecurityEvent(
      `${event.type}: ${JSON.stringify(event.details)}`,
      event.severity === 'critical' ? 'high' : event.severity,
      fullEvent
    );

    // Store security events separately
    this.storeSecurityEvent(fullEvent);

    // Alert on critical events
    if (event.severity === 'critical') {
      toast.error('تم اكتشاف نشاط مشبوه - يرجى المحاولة مرة أخرى');
    }
  }

  private storeSecurityEvent(event: SecurityEvent): void {
    try {
      const stored = localStorage.getItem('security_events');
      const events = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Keep only the last 100 security events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('security_events', JSON.stringify(events));
    } catch (error) {
      loggerService.error('Failed to store security event', { error });
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

  // Public methods to get security status
  getSecurityEvents(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem('security_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getFailedAttempts(identifier: string): { count: number; lastAttempt: number } | null {
    return this.failedAttempts.get(identifier) || null;
  }

  isRateLimited(identifier: string, maxRequests: number, windowMs: number): boolean {
    return !this.checkRateLimit(identifier, maxRequests, windowMs);
  }
}

// Export singleton instance
export const securityService = new SecurityService();
