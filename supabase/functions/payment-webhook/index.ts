import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { raiseFinancialAlert } from "../_shared/alerts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

interface MoyasarPayment {
  id: string;
  status: string;
  amount: number; // halalas
  currency: string;
  metadata?: Record<string, any>;
  source?: { name?: string };
}

// =============================================================================
// HMAC signature verification (constant-time)
// =============================================================================
async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (computed.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < computed.length; i++) result |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    return result === 0;
  } catch {
    return false;
  }
}

// =============================================================================
// Verify a payment with Moyasar (server-side ground truth)
// =============================================================================
async function fetchMoyasarPayment(paymentId: string): Promise<MoyasarPayment | null> {
  const key = Deno.env.get('MOYASAR_SECRET_KEY');
  if (!key) {
    console.error('[payment-webhook] MOYASAR_SECRET_KEY missing');
    return null;
  }
  try {
    const res = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${btoa(key + ':')}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[payment-webhook] Moyasar fetch error:', err);
    return null;
  }
}

// =============================================================================
// SINGLE unified path: confirms a booking after a verified `paid` payment.
// Delegates to the atomic SQL RPC `confirm_paid_booking` so all side-effects
// (split, invoices, wallet, tickets, loyalty, notifications) live in ONE
// transaction. Idempotent.
// =============================================================================
async function processPaidBooking(
  supabase: any,
  paymentId: string,
  bookingId: string,
  bookingType: 'event' | 'service'
): Promise<{ ok: boolean; reason?: string }> {
  // 1. Verify with provider (ground truth)
  const moyasar = await fetchMoyasarPayment(paymentId);
  if (!moyasar) return { ok: false, reason: 'provider_unreachable' };
  if (moyasar.status !== 'paid') return { ok: false, reason: `provider_status_${moyasar.status}` };

  // 2. Atomic RPC handles everything (idempotent)
  const { data, error } = await supabase.rpc('confirm_paid_booking', {
    p_booking_id: bookingId,
    p_booking_type: bookingType,
    p_payment_id: paymentId,
    p_provider_amount_halalas: moyasar.amount,
  });

  if (error) {
    console.error('[payment-webhook] confirm_paid_booking RPC error:', error);
    await raiseFinancialAlert({
      component: 'confirm_paid_booking',
      message: error.message ?? 'rpc_error',
      severity: 'critical',
      context: { source: 'payment-webhook', payment_id: paymentId },
      reference_type: bookingType === 'service' ? 'service_booking' : 'event_booking',
      reference_id: bookingId,
    });
    // Notify super_admins of failure (legacy in-app bell)
    try {
      const { data: admins } = await supabase
        .from('user_roles').select('user_id').eq('role', 'super_admin');
      if (admins && admins.length) {
        await supabase.from('notifications').insert(admins.map((a: any) => ({
          user_id: a.user_id,
          type: 'system_alert',
          title: 'فشل تأكيد دفعة',
          message: `فشل تأكيد الحجز ${bookingId}: ${error.message ?? 'rpc_error'}`,
          data: { booking_id: bookingId, payment_id: paymentId, error: error.message },
        })));
      }
    } catch (_) { /* swallow */ }
    return { ok: false, reason: error.message ?? 'rpc_error' };
  }

  if (!data?.ok) {
    console.warn('[payment-webhook] confirm_paid_booking declined:', data);
    await raiseFinancialAlert({
      component: 'confirm_paid_booking',
      message: data?.error ?? 'rpc_declined',
      severity: 'error',
      context: { source: 'payment-webhook', rpc_data: data, payment_id: paymentId },
      reference_type: bookingType === 'service' ? 'service_booking' : 'event_booking',
      reference_id: bookingId,
    });
    return { ok: false, reason: data?.error ?? 'rpc_declined' };
  }

  if (data.already_confirmed) {
    return { ok: true, reason: 'already_confirmed' };
  }
  return { ok: true };
}

// =============================================================================
// Mark payment + booking as failed (idempotent)
// =============================================================================
async function processFailedBooking(
  supabase: any,
  paymentId: string,
  bookingId: string,
  bookingType: 'event' | 'service'
) {
  const bookingTable = bookingType === 'service' ? 'service_bookings' : 'bookings';
  await supabase.from('payments').update({ status: 'failed' }).eq('provider_payment_id', paymentId);
  await supabase
    .from(bookingTable)
    .update({ status: 'failed' })
    .eq('id', bookingId)
    .neq('status', 'confirmed');

  const { data: booking } = await supabase
    .from(bookingTable)
    .select('user_id')
    .eq('id', bookingId)
    .single();
  if (booking?.user_id) {
    await supabase.from('notifications').insert({
      user_id: booking.user_id,
      type: 'payment_failed',
      title: 'فشل في الدفع',
      message: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
      data: { booking_id: bookingId, payment_id: paymentId },
    });
  }
}

// =============================================================================
// HTTP entry point
// =============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // -------------------------------------------------------------------------
  // GET: 3DS redirect callback from Moyasar.
  // Run the SAME unified processPaidBooking() before redirecting back to UI.
  // -------------------------------------------------------------------------
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('id') || '';
    const status = url.searchParams.get('status') || '';
    const message = url.searchParams.get('message') || '';
    const bookingId = url.searchParams.get('booking_id') || '';
    const bookingType = (url.searchParams.get('booking_type') || 'event') as 'event' | 'service';

    const frontendOrigin = url.searchParams.get('origin');
    const siteUrl = frontendOrigin
      ? decodeURIComponent(frontendOrigin)
      : (Deno.env.get('SITE_URL') || 'https://app.hiwaya.sa');

    console.log('[payment-webhook] 3DS redirect', { paymentId, status, bookingId, bookingType });

    if (status === 'paid' && paymentId && bookingId) {
      try {
        const result = await processPaidBooking(supabase, paymentId, bookingId, bookingType);
        if (!result.ok) {
          console.warn('[payment-webhook] 3DS processPaidBooking declined:', result.reason);
        }
      } catch (err) {
        console.error('[payment-webhook] 3DS processing error:', err);
      }

      const redirectUrl = new URL(siteUrl);
      redirectUrl.pathname = bookingType === 'service' ? '/service-checkout/success' : '/checkout/success';
      redirectUrl.searchParams.set('payment_id', paymentId);
      redirectUrl.searchParams.set('booking_id', bookingId);
      redirectUrl.searchParams.set('from_3ds', 'true');
      return new Response(null, { status: 302, headers: { Location: redirectUrl.toString(), ...corsHeaders } });
    }

    // Failed / cancelled / authentication required → callback page
    try {
      if (paymentId && bookingId && status && status !== 'paid') {
        await processFailedBooking(supabase, paymentId, bookingId, bookingType);
      }
    } catch (err) {
      console.error('[payment-webhook] 3DS failure logging error:', err);
    }
    const fallback = new URL(siteUrl);
    fallback.pathname = '/checkout/callback';
    fallback.searchParams.set('payment_id', paymentId);
    fallback.searchParams.set('status', status || 'failed');
    fallback.searchParams.set('booking_id', bookingId);
    fallback.searchParams.set('booking_type', bookingType);
    if (message) fallback.searchParams.set('message', message);
    return new Response(null, { status: 302, headers: { Location: fallback.toString(), ...corsHeaders } });
  }

  // -------------------------------------------------------------------------
  // POST: Async webhook from Moyasar (HMAC-protected).
  // -------------------------------------------------------------------------
  try {
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return json({ success: true, message: 'OK' }, 200);
    }

    const webhookSignature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (webhookSecret) {
      const valid = await verifyWebhookSignature(rawBody, webhookSignature, webhookSecret);
      if (!valid) {
        console.error('[payment-webhook] invalid signature');
        return json({ error: 'Invalid signature' }, 401);
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      console.error('[payment-webhook] bad json:', err);
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { type, data } = payload || {};
    if (!data?.id || !data?.metadata?.booking_id) {
      console.error('[payment-webhook] missing data.id or booking_id');
      return json({ error: 'Missing booking_id' }, 400);
    }

    const bookingType = (data.metadata.booking_type || 'event') as 'event' | 'service';
    const paymentId = data.id as string;
    const bookingId = data.metadata.booking_id as string;

    if (type === 'payment_paid') {
      const result = await processPaidBooking(supabase, paymentId, bookingId, bookingType);
      if (!result.ok) {
        console.warn('[payment-webhook] processPaidBooking declined:', result.reason);
        // Still 200 on already_confirmed; otherwise 400 so Moyasar retries.
        if (result.reason === 'already_confirmed') return json({ success: true, message: 'Already processed' }, 200);
        return json({ error: result.reason || 'processing_failed' }, 400);
      }
      return json({ success: true }, 200);
    }

    if (type === 'payment_failed') {
      await processFailedBooking(supabase, paymentId, bookingId, bookingType);
      return json({ success: true }, 200);
    }

    // Unknown event type — acknowledge to avoid retry storms
    console.log('[payment-webhook] ignored event type:', type);
    return json({ success: true, ignored: true }, 200);
  } catch (err) {
    console.error('[payment-webhook] error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
