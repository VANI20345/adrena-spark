import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  type: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    metadata: {
      booking_id: string;
      user_id: string;
    };
  };
}

// HMAC signature verification for webhook security
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison to prevent timing attacks
    if (computedSignature.length !== signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

// Verify payment status directly with payment provider (Moyasar)
async function verifyPaymentWithProvider(
  paymentId: string,
  expectedStatus: string
): Promise<{ valid: boolean; amount?: number }> {
  const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
  if (!moyasarSecretKey) {
    // SECURITY: Reject if secret key is not configured - prevents accepting unverified webhooks
    return { valid: false };
  }

  try {
    const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { valid: false };
    }

    const paymentData = await response.json();
    return { 
      valid: paymentData.status === expectedStatus,
      amount: paymentData.amount // Amount in halalas (cents)
    };
  } catch {
    return { valid: false };
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawBody = await req.text();
    const webhookSignature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    // 1. Verify webhook signature if secret is configured
    if (webhookSecret) {
      const isValidSignature = await verifyWebhookSignature(rawBody, webhookSignature, webhookSecret);
      if (!isValidSignature) {
        console.error('[payment-webhook] Invalid signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const payload: WebhookPayload = JSON.parse(rawBody);
    const { type, data } = payload;

    // 2. Verify payment status directly with the payment provider
    const expectedStatus = type === 'payment_paid' ? 'paid' : 'failed';
    const providerVerification = await verifyPaymentWithProvider(data.id, expectedStatus);
    
    if (!providerVerification.valid) {
      console.error('[payment-webhook] Payment verification failed with provider');
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. CRITICAL SECURITY: Validate metadata against database records
    if (data.metadata?.booking_id) {
      const { data: booking, error: bookingError } = await supabaseClient
        .from('bookings')
        .select('user_id, total_amount, status')
        .eq('id', data.metadata.booking_id)
        .single();

      if (bookingError || !booking) {
        console.error('[payment-webhook] Booking not found:', data.metadata.booking_id);
        return new Response(JSON.stringify({ error: 'Booking not found' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate user_id matches the booking owner
      if (data.metadata.user_id && booking.user_id !== data.metadata.user_id) {
        console.error('[payment-webhook] User ID mismatch - metadata:', data.metadata.user_id, 'booking:', booking.user_id);
        await supabaseClient.from('system_logs').insert({
          level: 'error',
          message: 'Payment webhook user ID mismatch - potential fraud attempt',
          details: { 
            metadata_user_id: data.metadata.user_id,
            booking_user_id: booking.user_id,
            booking_id: data.metadata.booking_id,
            payment_id: data.id
          }
        });
        return new Response(JSON.stringify({ error: 'Metadata mismatch' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate amount matches (allow 1 halala tolerance for rounding)
      const expectedAmount = Math.round(booking.total_amount * 100); // Convert to halalas
      const actualAmount = providerVerification.amount || data.amount;
      
      if (Math.abs(expectedAmount - actualAmount) > 1) {
        console.error('[payment-webhook] Amount mismatch - expected:', expectedAmount, 'actual:', actualAmount);
        await supabaseClient.from('system_logs').insert({
          level: 'error',
          message: 'Payment webhook amount mismatch - potential fraud attempt',
          details: { 
            expected_amount: expectedAmount,
            actual_amount: actualAmount,
            booking_id: data.metadata.booking_id,
            payment_id: data.id
          }
        });
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if booking is already confirmed (prevent double-processing)
      if (booking.status === 'confirmed' && type === 'payment_paid') {
        console.log('[payment-webhook] Booking already confirmed, skipping:', data.metadata.booking_id);
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Use the validated booking.user_id instead of metadata
      const validatedUserId = booking.user_id;

      // 4. Process verified and validated webhook
      if (type === 'payment_paid') {
        // Update payment status
        const { error: paymentError } = await supabaseClient
          .from('payments')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('provider_payment_id', data.id);

        if (paymentError) {
          console.error('[payment-webhook] Failed to update payment:', paymentError);
          throw paymentError;
        }

        // Update booking status
        const { error: bookingUpdateError } = await supabaseClient
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', data.metadata.booking_id);

        if (bookingUpdateError) {
          console.error('[payment-webhook] Failed to update booking:', bookingUpdateError);
          throw bookingUpdateError;
        }

        // Send confirmation notification using validated user_id
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: validatedUserId,
            type: 'payment_success',
            title: 'تم الدفع بنجاح',
            message: `تم استلام دفعتك بقيمة ${actualAmount / 100} ${data.currency}`,
            data: { 
              booking_id: data.metadata.booking_id,
              payment_id: data.id,
              amount: actualAmount / 100
            }
          });

        console.log('[payment-webhook] Payment processed successfully for booking:', data.metadata.booking_id);

      } else if (type === 'payment_failed') {
        // Update payment status
        await supabaseClient
          .from('payments')
          .update({ status: 'failed' })
          .eq('provider_payment_id', data.id);

        // Update booking status
        await supabaseClient
          .from('bookings')
          .update({ status: 'failed' })
          .eq('id', data.metadata.booking_id);

        // Send failure notification using validated user_id
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: validatedUserId,
            type: 'payment_failed',
            title: 'فشل في الدفع',
            message: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
            data: { 
              booking_id: data.metadata.booking_id,
              payment_id: data.id
            }
          });

        console.log('[payment-webhook] Payment failure processed for booking:', data.metadata.booking_id);
      }
    } else {
      console.error('[payment-webhook] Missing booking_id in metadata');
      return new Response(JSON.stringify({ error: 'Missing booking_id in metadata' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Log to system logs instead of console
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseClient.from('system_logs').insert({
      level: 'error',
      message: 'Payment webhook processing error',
      details: { error: String(error) }
    });

    console.error('[payment-webhook] Error:', error);

    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
