import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
// Handles both the 3DS GET redirect and the async POST webhook.
// Idempotent: safe to call multiple times for the same booking.
// =============================================================================
async function processPaidBooking(
  supabase: any,
  paymentId: string,
  bookingId: string,
  bookingType: 'event' | 'service'
): Promise<{ ok: boolean; reason?: string }> {
  const bookingTable = bookingType === 'service' ? 'service_bookings' : 'bookings';

  // 1. Verify with provider (ground truth)
  const moyasar = await fetchMoyasarPayment(paymentId);
  if (!moyasar) return { ok: false, reason: 'provider_unreachable' };
  if (moyasar.status !== 'paid') return { ok: false, reason: `provider_status_${moyasar.status}` };

  // 2. Load booking
  const { data: booking, error: bookingErr } = await supabase
    .from(bookingTable)
    .select('id, user_id, total_amount, status, provider_id, quantity, event_id')
    .eq('id', bookingId)
    .single();
  if (bookingErr || !booking) {
    console.error('[payment-webhook] booking not found', { bookingId, bookingErr });
    return { ok: false, reason: 'booking_not_found' };
  }

  // 3. Idempotency — already confirmed?
  if (booking.status === 'confirmed') {
    console.log('[payment-webhook] booking already confirmed (idempotent skip)', bookingId);
    return { ok: true, reason: 'already_confirmed' };
  }

  // 4. Amount match
  const expectedHalalas = Math.round(Number(booking.total_amount) * 100);
  if (Math.abs(expectedHalalas - moyasar.amount) > 1) {
    console.error('[payment-webhook] amount mismatch', { expectedHalalas, moyasarAmount: moyasar.amount, bookingId });
    return { ok: false, reason: 'amount_mismatch' };
  }

  const userId = booking.user_id;
  const totalAmount = Number(booking.total_amount);

  // 5. Mark payment row completed
  const { error: payUpdErr } = await supabase
    .from('payments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('provider_payment_id', paymentId);
  if (payUpdErr) console.error('[payment-webhook] payments update failed:', payUpdErr);

  // 6. Confirm booking (lock-then-update via WHERE status<>confirmed for safety)
  const { error: bookUpdErr } = await supabase
    .from(bookingTable)
    .update({ status: 'confirmed', payment_id: paymentId })
    .eq('id', bookingId)
    .neq('status', 'confirmed');
  if (bookUpdErr) console.error('[payment-webhook] booking confirm failed:', bookUpdErr);

  // 7. RPC: create payment hold + 70/30 split + provider wallet credit + financial log
  const { data: holdRes, error: holdErr } = await supabase.rpc('create_payment_hold_with_split', {
    p_booking_id: bookingId,
    p_booking_type: bookingType,
  });
  if (holdErr) console.error('[payment-webhook] create_payment_hold_with_split failed:', holdErr);
  else console.log('[payment-webhook] hold result:', holdRes);

  // 8. RPC: generate customer + commission invoices
  const { error: invErr } = await supabase.rpc('generate_booking_invoices', {
    p_booking_id: bookingId,
    p_booking_type: bookingType,
  });
  if (invErr) console.error('[payment-webhook] generate_booking_invoices failed:', invErr);

  // 9. User-side wallet transaction (negative payment)
  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    type: 'payment',
    amount: -totalAmount,
    description: bookingType === 'event'
      ? `دفع حجز فعالية #${bookingId.substring(0, 8)}`
      : `دفع حجز خدمة #${bookingId.substring(0, 8)}`,
    status: 'completed',
    reference_id: bookingId,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
  });

  // 10. Pull persisted commission to log a precise booking_payment entry.
  const { data: bookingFin } = await supabase
    .from(bookingTable)
    .select('platform_commission, provider_earnings, vat_on_commission, commission_rate, provider_id')
    .eq('id', bookingId)
    .single();

  const platformCommission = Number(bookingFin?.platform_commission ?? 0);
  const providerEarnings = Number(bookingFin?.provider_earnings ?? 0);
  const vatOnCommission = Number(bookingFin?.vat_on_commission ?? (platformCommission - platformCommission / 1.15));
  const commissionRate = Number(bookingFin?.commission_rate ?? 0);
  const providerId = bookingFin?.provider_id ?? booking.provider_id ?? null;

  await supabase.from('financial_transaction_logs').insert({
    transaction_type: 'booking_payment',
    amount: totalAmount,
    commission_amount: platformCommission,
    vat_amount: vatOnCommission,
    net_amount: providerEarnings,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
    reference_id: bookingId,
    payer_id: userId,
    receiver_id: providerId,
    status: 'completed',
    service_type: bookingType,
    metadata: {
      payment_id: paymentId,
      commission_rate: commissionRate,
      webhook_unified: true,
    },
  });

  // 11. Tickets + attendee count for event bookings
  if (bookingType === 'event' && booking.quantity && booking.event_id) {
    // Only create tickets if none exist yet (idempotency)
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: false })
      .eq('booking_id', bookingId)
      .limit(1);
    if (!existingTickets || existingTickets.length === 0) {
      const holderName = (moyasar.metadata as any)?.payer_name || moyasar.source?.name || 'Guest';
      const tickets = Array.from({ length: booking.quantity }, (_, i) => ({
        booking_id: bookingId,
        ticket_number: `${bookingId.substring(0, 8)}-${i + 1}`,
        qr_code: `${bookingId}-${i + 1}-${Date.now()}`,
        holder_name: holderName,
        status: 'active',
      }));
      await supabase.from('tickets').insert(tickets);
      await supabase.rpc('increment_event_attendees', {
        event_id: booking.event_id,
        increment_by: booking.quantity,
      });
    }
  }

  // 12. Loyalty (1% of paid amount)
  const points = Math.floor(totalAmount * 0.01);
  if (points > 0) {
    await supabase.from('loyalty_ledger').insert({
      user_id: userId,
      points,
      type: 'earned',
      description: `نقاط من الحجز ${bookingId.substring(0, 8)}`,
      reference_id: bookingId,
      reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
    });
  }

  // 13. Notifications
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment_success',
    title: 'تم الدفع بنجاح',
    message: `تم استلام دفعتك بقيمة ${totalAmount} ريال`,
    data: { booking_id: bookingId, payment_id: paymentId, amount: totalAmount, booking_type: bookingType },
  });

  if (providerId) {
    await supabase.from('notifications').insert({
      user_id: providerId,
      type: 'new_booking_received',
      title: 'تم شراء تذكرة جديدة',
      message: `تم استلام حجز جديد بقيمة ${totalAmount} ريال. سيتم إيداع 70% فوراً والباقي بعد فترة الحجز.`,
      data: { booking_id: bookingId, amount: totalAmount, booking_type: bookingType },
    });
  }

  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'super_admin']);
  if (adminRoles && adminRoles.length > 0) {
    await supabase.from('notifications').insert(
      adminRoles.map((r: any) => ({
        user_id: r.user_id,
        type: 'admin_new_payment',
        title: 'عملية دفع جديدة',
        message: `تم استلام دفعة بقيمة ${totalAmount} ريال من ${bookingType === 'event' ? 'حجز فعالية' : 'حجز خدمة'}.`,
        data: { booking_id: bookingId, amount: totalAmount, booking_type: bookingType, provider_id: providerId },
      }))
    );
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
      : (Deno.env.get('SITE_URL') || 'https://lovable.dev');

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
