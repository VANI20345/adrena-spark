import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutCallback = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';
  
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<{
    bookingId?: string;
    bookingReference?: string;
    eventId?: string;
    serviceBookingId?: string;
    bookingType?: string;
  } | null>(null);

  // Get params from URL (3DS redirect) or location state (direct navigation)
  const urlPaymentId = searchParams.get('payment_id');
  const urlStatus = searchParams.get('status');
  const urlMessage = searchParams.get('message');
  const urlBookingId = searchParams.get('booking_id');
  const urlBookingType = searchParams.get('booking_type') || 'event';
  
  const stateStatus = location.state?.status;
  const stateMessage = location.state?.message;
  const stateBookingId = location.state?.bookingId;
  const stateBookingType = location.state?.bookingType || 'event';
  const statePaymentId = location.state?.paymentId;

  useEffect(() => {
    handlePaymentCallback();
  }, []);

  const handlePaymentCallback = async () => {
    const paymentId = urlPaymentId || statePaymentId;
    const paymentStatus = urlStatus || stateStatus;
    const message = urlMessage || stateMessage;
    const bookingId = urlBookingId || stateBookingId;
    const bookingType = urlBookingType || stateBookingType;

    // Handle explicit failure status
    if (paymentStatus === 'failed') {
      setStatus('failed');
      setErrorMessage(message || (isRTL ? 'لم نتمكن من معالجة الدفع' : 'We could not process your payment'));
      setPaymentDetails({ bookingId, bookingType });
      toast({
        title: isRTL ? 'فشل الدفع' : 'Payment Failed',
        description: message || (isRTL ? 'لم نتمكن من معالجة الدفع' : 'We could not process your payment'),
        variant: 'destructive'
      });
      return;
    }

    // Handle pending/processing status - poll for updates
    if (!paymentId && !bookingId) {
      setStatus('failed');
      setErrorMessage(isRTL ? 'لم يتم العثور على معرف الدفع أو الحجز' : 'Payment or booking ID not found');
      return;
    }

    // If we have a payment ID, poll for status
    if (paymentId) {
      await pollPaymentStatus(paymentId, bookingId, bookingType);
    } else if (bookingId) {
      // Check booking status directly
      await checkBookingStatus(bookingId, bookingType);
    }
  };

  const pollPaymentStatus = async (paymentId: string, bookingId?: string, bookingType?: string) => {
    let attempts = 0;
    const maxAttempts = 15;
    
    const checkPayment = async (): Promise<boolean> => {
      try {
        // Check payment record
        const { data: payment } = await supabase
          .from('payments')
          .select('status, booking_id')
          .eq('provider_payment_id', paymentId)
          .maybeSingle();

        if (payment) {
          if (payment.status === 'completed') {
            // Payment confirmed - get booking details based on type
            if (bookingType === 'service') {
              const { data: serviceBooking } = await supabase
                .from('service_bookings')
                .select('id, booking_reference, service_id')
                .eq('id', payment.booking_id || bookingId)
                .maybeSingle();

              if (serviceBooking) {
                setPaymentDetails({
                  bookingId: serviceBooking.id,
                  bookingReference: serviceBooking.booking_reference,
                  serviceBookingId: serviceBooking.id,
                  bookingType
                });
              }
            } else {
              const { data: eventBooking } = await supabase
                .from('bookings')
                .select('id, booking_reference, event_id')
                .eq('id', payment.booking_id || bookingId)
                .maybeSingle();

              if (eventBooking) {
                setPaymentDetails({
                  bookingId: eventBooking.id,
                  bookingReference: eventBooking.booking_reference,
                  eventId: eventBooking.event_id,
                  bookingType
                });
              }
            }
            
            setStatus('success');
            toast({
              title: isRTL ? 'تم الدفع بنجاح' : 'Payment Successful',
              description: isRTL ? 'تم تأكيد حجزك' : 'Your booking has been confirmed'
            });
            return true;
          } else if (payment.status === 'failed') {
            setStatus('failed');
            setErrorMessage(isRTL ? 'فشل في معالجة الدفع' : 'Payment processing failed');
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Error checking payment:', error);
        return false;
      }
    };

    // Initial check
    const done = await checkPayment();
    if (done) return;

    // Poll every 2 seconds
    const pollInterval = setInterval(async () => {
      attempts++;
      const isDone = await checkPayment();
      
      if (isDone || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        
        if (attempts >= maxAttempts && status === 'processing') {
          // Timeout - check booking status as fallback
          if (bookingId) {
            await checkBookingStatus(bookingId, bookingType);
          } else {
            setStatus('failed');
            setErrorMessage(isRTL ? 'انتهت مهلة التحقق من الدفع' : 'Payment verification timed out');
          }
        }
      }
    }, 2000);
  };

  const checkBookingStatus = async (bookingId: string, bookingType?: string) => {
    try {
      if (bookingType === 'service') {
        const { data: serviceBooking } = await supabase
          .from('service_bookings')
          .select('id, booking_reference, service_id, status')
          .eq('id', bookingId)
          .maybeSingle();

        if (serviceBooking) {
          if (serviceBooking.status === 'confirmed') {
            setPaymentDetails({
              bookingId: serviceBooking.id,
              bookingReference: serviceBooking.booking_reference,
              serviceBookingId: serviceBooking.id,
              bookingType
            });
            setStatus('success');
          } else if (serviceBooking.status === 'failed' || serviceBooking.status === 'cancelled') {
            setStatus('failed');
            setErrorMessage(isRTL ? 'فشل الحجز أو تم إلغاؤه' : 'Booking failed or was cancelled');
          }
        } else {
          setStatus('failed');
          setErrorMessage(isRTL ? 'لم يتم العثور على الحجز' : 'Booking not found');
        }
      } else {
        const { data: eventBooking } = await supabase
          .from('bookings')
          .select('id, booking_reference, event_id, status')
          .eq('id', bookingId)
          .maybeSingle();

        if (eventBooking) {
          if (eventBooking.status === 'confirmed') {
            setPaymentDetails({
              bookingId: eventBooking.id,
              bookingReference: eventBooking.booking_reference,
              eventId: eventBooking.event_id,
              bookingType
            });
            setStatus('success');
          } else if (eventBooking.status === 'failed' || eventBooking.status === 'cancelled') {
            setStatus('failed');
            setErrorMessage(isRTL ? 'فشل الحجز أو تم إلغاؤه' : 'Booking failed or was cancelled');
          }
        } else {
          setStatus('failed');
          setErrorMessage(isRTL ? 'لم يتم العثور على الحجز' : 'Booking not found');
        }
      }
    } catch (error) {
      console.error('Error checking booking:', error);
      setStatus('failed');
      setErrorMessage(isRTL ? 'خطأ في التحقق من الحجز' : 'Error verifying booking');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      if (paymentDetails?.bookingType === 'service' || paymentDetails?.serviceBookingId) {
        navigate('/service-checkout/success', {
          state: { serviceBookingId: paymentDetails.serviceBookingId }
        });
      } else {
        navigate('/checkout/success', {
          state: {
            bookingId: paymentDetails?.bookingId,
            bookingReference: paymentDetails?.bookingReference,
            eventId: paymentDetails?.eventId
          }
        });
      }
    } else {
      navigate('/my-events');
    }
  };

  const handleRetry = () => {
    // Go back to the checkout page to retry payment
    const bookingId = paymentDetails?.bookingId || urlBookingId || stateBookingId;
    const bookingType = paymentDetails?.bookingType || urlBookingType || stateBookingType;
    
    if (bookingType === 'service') {
      navigate(`/service/${paymentDetails?.serviceBookingId}/checkout`);
    } else if (bookingId) {
      // Try to go back to checkout
      navigate(-1);
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-4">
                {isRTL ? 'جاري معالجة الدفع...' : 'Processing Payment...'}
              </h1>
              <p className="text-muted-foreground">
                {isRTL ? 'يرجى الانتظار بينما نتحقق من دفعتك' : 'Please wait while we verify your payment'}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-4">
                {isRTL ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {isRTL ? 'تم تأكيد حجزك بنجاح' : 'Your booking has been confirmed'}
              </p>
              <Button onClick={handleContinue} className="w-full">
                {isRTL ? 'عرض تفاصيل الحجز' : 'View Booking Details'}
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                {isRTL ? 'فشل الدفع' : 'Payment Failed'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {errorMessage || (isRTL 
                  ? 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى'
                  : 'We could not process your payment. Please try again')}
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleRetry} className="w-full">
                  {isRTL ? 'المحاولة مرة أخرى' : 'Try Again'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/my-events')} className="w-full">
                  {isRTL ? 'العودة لفعالياتي' : 'Back to My Events'}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutCallback;