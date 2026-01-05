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
): Promise<boolean> {
  const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
  if (!moyasarSecretKey) {
    // SECURITY: Reject if secret key is not configured - prevents accepting unverified webhooks
    return false;
  }

  try {
    const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const paymentData = await response.json();
    return paymentData.status === expectedStatus;
  } catch {
    return false;
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
    const isValidPayment = await verifyPaymentWithProvider(data.id, expectedStatus);
    
    if (!isValidPayment) {
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Process verified webhook
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
        throw paymentError;
      }

      // Update booking status
      if (data.metadata?.booking_id) {
        await supabaseClient
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', data.metadata.booking_id);
      }

      // Send confirmation notification
      if (data.metadata?.user_id) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: data.metadata.user_id,
            type: 'payment_success',
            title: 'تم الدفع بنجاح',
            message: `تم استلام دفعتك بقيمة ${data.amount / 100} ${data.currency}`,
            data: { 
              booking_id: data.metadata.booking_id,
              payment_id: data.id,
              amount: data.amount / 100
            }
          });
      }

    } else if (type === 'payment_failed') {
      // Update payment and booking status
      await supabaseClient
        .from('payments')
        .update({ status: 'failed' })
        .eq('provider_payment_id', data.id);

      if (data.metadata?.booking_id) {
        await supabaseClient
          .from('bookings')
          .update({ status: 'failed' })
          .eq('id', data.metadata.booking_id);
      }

      // Send failure notification
      if (data.metadata?.user_id) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: data.metadata.user_id,
            type: 'payment_failed',
            title: 'فشل في الدفع',
            message: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
            data: { 
              booking_id: data.metadata.booking_id,
              payment_id: data.id
            }
          });
      }
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

    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
