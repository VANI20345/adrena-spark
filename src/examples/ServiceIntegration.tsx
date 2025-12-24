import React, { useEffect, useState } from 'react';
import { loggerService } from '@/services/logger';
import { securityService } from '@/services/security';
import { cacheService } from '@/services/caching';
import { retryService } from '@/services/retry';
import { errorMiddleware } from '@/middleware/errorMiddleware';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Example: Payment Component with Security & Retry Integration
export const SecurePaymentForm: React.FC = () => {
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCardNumberChange = (value: string) => {
    // Use security service for input sanitization
    const sanitized = securityService.sanitizeInput(value, 'text');
    setCardNumber(sanitized);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    const userIdentifier = localStorage.getItem('user_id') || 'anonymous';
    
    try {
      // Check rate limiting
      if (!securityService.checkRateLimit(userIdentifier, 3, 300000)) { // 3 attempts per 5 minutes
        toast.error('Too many payment attempts. Please wait.');
        return;
      }

      // Log user action
      loggerService.logUserAction('payment_initiated', { amount });

      // Use retry service for critical payment operation
      const paymentResult = await retryService.withRetry(
        async () => {
          const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardNumber, amount })
          });
          
          if (!response.ok) throw new Error(`Payment failed: ${response.status}`);
          return response.json();
        },
        { 
          maxAttempts: 3, 
          baseDelay: 1000,
          backoffMultiplier: 2,
          retryCondition: (error) => error.message.includes('network') || error.message.includes('timeout')
        },
        'payment_processing'
      );

      // Cache successful payment for offline access
      await cacheService.set('last_payment', paymentResult, 3600000); // 1 hour

      loggerService.info('Payment successful', { paymentId: paymentResult.id });
      toast.success('Payment processed successfully!');

    } catch (error) {
      // Log the exception with context
      loggerService.logException(error as Error, 'payment_processing', { amount, cardNumber: '***masked***' });
      
      // Security: Log suspicious activity if too many failures
      securityService.recordFailedAuthentication(userIdentifier);
      
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Secure Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Card Number"
          value={cardNumber}
          onChange={(e) => handleCardNumberChange(e.target.value)}
          maxLength={19}
        />
        <Input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button 
          onClick={processPayment} 
          disabled={isProcessing || !cardNumber || !amount}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </CardContent>
    </Card>
  );
};

// Example: Event List with Caching & Error Middleware
export const EventListWithCaching: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Try to get from cache first
      const cachedEvents = await cacheService.get<any[]>('events_list');
      if (cachedEvents) {
        setEvents(cachedEvents);
        setLoading(false);
        loggerService.info('Events loaded from cache');
        return;
      }

      // Make API call with error handling
      const response = await fetch('/api/events', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const eventData = await response.json();
      
      // Cache the results for 30 minutes
      await cacheService.set('events_list', eventData, 1800000);

      setEvents(eventData);
      loggerService.logPerformance('events_loaded', Date.now() - performance.now());

    } catch (error) {
      loggerService.logException(error as Error, 'event_loading');
      toast.error('Failed to load events');
      
      // Try to get any cached data as fallback
      const fallbackEvents = await cacheService.get<any[]>('events_list');
      if (fallbackEvents) {
        setEvents(fallbackEvents);
        toast.info('Showing cached events');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    // Sanitize search input
    const sanitizedTerm = securityService.sanitizeInput(term, 'text');
    setSearchTerm(sanitizedTerm);
    
    // Log search action
    loggerService.logUserAction('event_search', { searchTerm: sanitizedTerm });
  };

  if (loading) return <div>Loading events...</div>;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search events..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className="grid gap-4">
        {events
          .filter((event: any) => 
            event.title.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((event: any) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};

// Example: Notification System with Retry Logic
export const NotificationManager: React.FC = () => {
  const sendNotification = async (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    try {
      // Use retry service for notification sending
      await retryService.withRetry(
        async () => {
          const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, type })
          });
          
          if (!response.ok) throw new Error('Notification failed');
          return response.json();
        },
        {
          maxAttempts: 3,
          baseDelay: 500,
          retryCondition: (error) => !error.message.includes('rate limit')
        },
        'notification_sending'
      );

      loggerService.info('Notification sent successfully', { message, type });
      toast.success('Notification sent!');

    } catch (error) {
      loggerService.logException(error as Error, 'notification_sending', { message, type });
      
      // Store failed notification for later retry (24 hours)
      await cacheService.set(`failed_notification_${Date.now()}`, 
        { message, type, timestamp: Date.now() }, 
        86400000
      );
      
      toast.error('Notification failed - will retry later');
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={() => sendNotification('Test notification', 'info')}>
        Send Test Notification
      </Button>
      <Button 
        variant="outline" 
        onClick={() => sendNotification('Warning message', 'warning')}
      >
        Send Warning
      </Button>
    </div>
  );
};