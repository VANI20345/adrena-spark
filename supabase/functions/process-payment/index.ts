import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  callback_url?: string;
  frontend_origin?: string;
  source: {
    type?: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
    name: string;
  };
  booking_id: string;
  booking_type?: 'event' | 'service';
}

interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

const DEFAULT_RATES: CommissionRates = { events: 10, services: 10, training: 10 };

async function getCommissionRates(supabase: any): Promise<CommissionRates> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['commission_events', 'commission_services', 'commission_training']);
    if (error) throw error;
    const rates = { ...DEFAULT_RATES };
    (data || []).forEach((row: any) => {
      const v = typeof row.value === 'object' && row.value !== null ? row.value.percentage : row.value;
      const pct = Number(v);
      if (!Number.isFinite(pct)) return;
      if (row.key === 'commission_events') rates.events = pct;
      if (row.key === 'commission_services') rates.services = pct;
      if (row.key === 'commission_training') rates.training = pct;
    });
    return rates;
  } catch (err) {
    console.error('[process-payment] commission fetch error:', err);
    return DEFAULT_RATES;
  }
}

function calculateBreakdown(totalAmount: number, commissionRate: number, isDiscounted = false) {
  const VAT_RATE = 0.15;
  const effective = isDiscounted ? 0 : commissionRate;
  const platformCommission = (totalAmount * effective) / 100;
  const vatOnCommission = platformCommission - platformCommission / (1 + VAT_RATE);
  const providerEarnings = totalAmount - platformCommission;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    commissionRate: effective,
    platformCommission: r(platformCommission),
    vatOnCommission: r(vatOnCommission),
    providerEarnings: r(providerEarnings),
    isDiscounted,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    // 2. Parse + validate body
    const body: PaymentRequest = await req.json().catch(() => ({} as any));
    const { amount, currency, description, source, booking_id, booking_type = 'event', frontend_origin } = body;

    if (!amount || amount <= 0) return json({ error: 'Invalid amount' }, 400);
    if (!booking_id) return json({ error: 'Missing booking_id' }, 400);
    if (!source?.number || !source?.cvc || !source?.month || !source?.year || !source?.name) {
      return json({ error: 'Invalid card source' }, 400);
    }

    // 3. Verify booking exists, belongs to user, and amount matches
    const bookingTable = booking_type === 'service' ? 'service_bookings' : 'bookings';
    const selectClause = booking_type === 'service'
      ? 'id, user_id, total_amount, status, provider_id, service_id, is_discounted, services!service_id(service_type, provider_id)'
      : 'id, user_id, total_amount, status, event_id, events!event_id(organizer_id)';

    const { data: booking, error: bookingErr } = await supabase
      .from(bookingTable)
      .select(selectClause)
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return json({ error: 'Booking not found' }, 404);
    }
    if ((booking as any).user_id !== userId) {
      return json({ error: 'Unauthorized - booking does not belong to user' }, 403);
    }
    // SECURITY: The server-side booking.total_amount is the single source of truth.
    // Ignore any client-supplied amount and charge exactly what the DB says.
    const authoritativeAmount = Number((booking as any).total_amount);
    if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
      return json({ error: 'Invalid booking amount' }, 400);
    }
    if (Math.abs(authoritativeAmount - amount) > 0.01) {
      console.warn('[process-payment] client amount differs from booking, using booking amount', {
        booking_amount: authoritativeAmount, client_amount: amount,
      });
    }

    // 4. Determine provider + commission type and persist breakdown on booking
    let providerId = '';
    let commissionType: keyof CommissionRates = 'services';
    let isDiscounted = false;

    if (booking_type === 'service') {
      const sb = booking as any;
      providerId = sb.provider_id || sb.services?.provider_id || '';
      const stype = sb.services?.service_type || 'other';
      isDiscounted = !!sb.is_discounted || stype === 'discount';
      commissionType = stype === 'training' ? 'training' : 'services';
    } else {
      const eb = booking as any;
      providerId = eb.events?.organizer_id || '';
      commissionType = 'events';
    }

    const rates = await getCommissionRates(supabase);
    const breakdown = calculateBreakdown(authoritativeAmount, rates[commissionType], isDiscounted);

    const { error: updateErr } = await supabase
      .from(bookingTable)
      .update({
        commission_rate: breakdown.commissionRate,
        platform_commission: breakdown.platformCommission,
        provider_earnings: breakdown.providerEarnings,
        vat_on_commission: breakdown.vatOnCommission,
      })
      .eq('id', booking_id);
    if (updateErr) {
      console.error('[process-payment] failed to persist commission on booking:', updateErr);
    }

    // 5. Call Moyasar
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    if (!moyasarSecretKey) {
      console.error('[process-payment] MOYASAR_SECRET_KEY not configured');
      return json({ error: 'Payment gateway not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const encodedOrigin = encodeURIComponent(frontend_origin || Deno.env.get('SITE_URL') || 'https://app.hiwaya.sa');
    const callbackUrl = `${supabaseUrl}/functions/v1/payment-webhook?booking_id=${booking_id}&booking_type=${booking_type}&origin=${encodedOrigin}&provider_id=${providerId}`;

    const moyasarRes = await fetch('https://api.moyasar.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(authoritativeAmount * 100),
        currency: currency || 'SAR',
        description: description || `Payment for booking ${booking_id}`,
        source: {
          type: source.type || 'creditcard',
          number: source.number,
          cvc: source.cvc,
          month: source.month,
          year: source.year,
          name: source.name,
        },
        callback_url: callbackUrl,
        metadata: {
          booking_id,
          user_id: userId,
          booking_type,
          provider_id: providerId,
          commission_rate: breakdown.commissionRate,
          platform_commission: breakdown.platformCommission,
          provider_earnings: breakdown.providerEarnings,
        },
      }),
    });

    const paymentResult = await moyasarRes.json();

    if (!moyasarRes.ok) {
      console.error('[process-payment] Moyasar error:', paymentResult);
      const errorMessage = paymentResult.message || paymentResult.errors?.[0]?.message || 'Payment processing failed';
      return json({ error: errorMessage }, 400);
    }

    // 6. Persist a `payments` row in 'pending' state. The webhook is the SINGLE
    //    source of truth that flips it to 'completed' and confirms the booking.
    const { error: paymentRecordErr } = await supabase
      .from('payments')
      .insert({
        booking_id,
        amount: authoritativeAmount,
        status: 'pending',
        payment_method: 'credit_card',
        payment_provider: 'moyasar',
        provider_payment_id: paymentResult.id,
        currency: currency || 'SAR',
      });
    if (paymentRecordErr) {
      console.error('[process-payment] failed to record payment:', paymentRecordErr);
    }

    // Return Moyasar response as-is. Wallet/holds/bookings.status are handled
    // exclusively by payment-webhook (3DS GET callback or async POST webhook).
    return json(paymentResult, 200);
  } catch (err) {
    console.error('[process-payment] error:', err);
    return json({ error: (err as Error).message || 'Payment processing failed' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
