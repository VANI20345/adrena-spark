import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyRequest {
  booking_id: string;
  booking_type: 'event' | 'service';
  payment_id?: string;
}

type EventBookingRow = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  payment_id: string | null;
  provider_earnings: number | null;
  platform_commission: number | null;
  commission_rate: number | null;
  event_id: string;
};

type ServiceBookingRow = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  payment_id: string | null;
  provider_id: string;
  provider_earnings: number | null;
  platform_commission: number | null;
  commission_rate: number | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;
    const body: VerifyRequest = await req.json();
    const { booking_id, booking_type, payment_id } = body;

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'booking_id is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[verify-payment] Verifying booking:', booking_id, 'type:', booking_type);

    const bookingTable = booking_type === 'service' ? 'service_bookings' : 'bookings';

    // Get booking details
    // NOTE: `bookings` does NOT have `provider_id` (only service_bookings does). Selecting it causes a DB error,
    // which was being surfaced as "Booking not found".
    let booking: EventBookingRow | ServiceBookingRow | null = null;
    let bookingError: any = null;

    if (booking_type === 'service') {
      const res = await serviceClient
        .from('service_bookings')
        .select('id, user_id, status, total_amount, payment_id, provider_id, provider_earnings, platform_commission, commission_rate')
        .eq('id', booking_id)
        .maybeSingle();
      booking = (res.data as ServiceBookingRow | null) ?? null;
      bookingError = res.error;
    } else {
      const res = await serviceClient
        .from('bookings')
        .select('id, user_id, status, total_amount, payment_id, provider_earnings, platform_commission, commission_rate, event_id')
        .eq('id', booking_id)
        .maybeSingle();
      booking = (res.data as EventBookingRow | null) ?? null;
      bookingError = res.error;
    }

    if (bookingError || !booking) {
      console.error('[verify-payment] Booking lookup failed:', bookingError);
      return new Response(JSON.stringify({
        error: 'Booking not found',
        details: bookingError?.message ?? bookingError
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user owns this booking
    if (booking.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // If already confirmed, return success
    if (booking.status === 'confirmed') {
      console.log('[verify-payment] Booking already confirmed');
      return new Response(JSON.stringify({ 
        success: true, 
        status: 'confirmed',
        message: 'Booking is already confirmed'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get payment record
    let paymentRecord = null;
    if (payment_id) {
      const { data } = await serviceClient
        .from('payments')
        .select('id, provider_payment_id, status')
        .eq('provider_payment_id', payment_id)
        .maybeSingle();
      paymentRecord = data;
    } else if (booking.payment_id) {
      const { data } = await serviceClient
        .from('payments')
        .select('id, provider_payment_id, status')
        .eq('id', booking.payment_id)
        .maybeSingle();
      paymentRecord = data;
    } else {
      // Try to find by booking_id in metadata
      const { data } = await serviceClient
        .from('payments')
        .select('id, provider_payment_id, status')
        .eq('booking_id', booking_id)
        .maybeSingle();
      paymentRecord = data;
    }

    if (!paymentRecord?.provider_payment_id) {
      console.log('[verify-payment] No payment record found');
      return new Response(JSON.stringify({ 
        success: false, 
        status: 'no_payment',
        message: 'No payment record found for this booking'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify with Moyasar
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    if (!moyasarSecretKey) {
      console.error('[verify-payment] MOYASAR_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Payment verification not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[verify-payment] Checking Moyasar payment:', paymentRecord.provider_payment_id);

    const moyasarResponse = await fetch(
      `https://api.moyasar.com/v1/payments/${paymentRecord.provider_payment_id}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!moyasarResponse.ok) {
      console.error('[verify-payment] Moyasar API error:', moyasarResponse.status);
      return new Response(JSON.stringify({ 
        success: false, 
        status: 'verification_failed',
        message: 'Could not verify payment with payment provider'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const moyasarPayment = await moyasarResponse.json();
    console.log('[verify-payment] Moyasar payment status:', moyasarPayment.status);

     if (moyasarPayment.status === 'paid') {
      // Payment is confirmed - update our records
      console.log('[verify-payment] Payment confirmed, updating records');

      // Update payment status
      await serviceClient
        .from('payments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      // Update booking status + attach payment row id (NOT Moyasar provider payment id)
      await serviceClient
        .from(bookingTable)
        .update({ status: 'confirmed', payment_id: paymentRecord.id })
        .eq('id', booking_id);

      // Credit provider wallet if applicable
      let providerId: string | null = null;
      if (booking_type === 'service') {
        providerId = (booking as ServiceBookingRow).provider_id;
      } else {
        // For events, provider is the event organizer
        const { data: ev } = await serviceClient
          .from('events')
          .select('organizer_id')
          .eq('id', (booking as EventBookingRow).event_id)
          .maybeSingle();
        providerId = ev?.organizer_id ?? null;
      }

      const providerEarnings = booking.provider_earnings || 0;

      if (providerId && providerEarnings > 0) {
        // Update provider wallet (safe, no dependency on custom RPCs)
        const { data: wallet } = await serviceClient
          .from('user_wallets')
          .select('balance, total_earned')
          .eq('user_id', providerId)
          .maybeSingle();

        const currentBalance = Number(wallet?.balance ?? 0);
        const currentTotalEarned = Number(wallet?.total_earned ?? 0);

        // If wallet row doesn't exist, create it
        if (!wallet) {
          await serviceClient.from('user_wallets').insert({
            user_id: providerId,
            balance: providerEarnings,
            total_earned: providerEarnings,
            total_withdrawn: 0
          });
        } else {
          await serviceClient
            .from('user_wallets')
            .update({
              balance: currentBalance + providerEarnings,
              total_earned: currentTotalEarned + providerEarnings,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', providerId);
        }

        // Log wallet transaction for provider
        await serviceClient.from('wallet_transactions').insert({
          user_id: providerId,
          type: 'credit',
          amount: providerEarnings,
          description: booking_type === 'event' 
            ? `إيرادات حجز فعالية #${booking_id.substring(0, 8)}`
            : `إيرادات حجز خدمة #${booking_id.substring(0, 8)}`,
          status: 'completed',
          reference_id: booking_id,
          reference_type: booking_type === 'event' ? 'event_booking' : 'service_booking'
        });
      }

      // Log user payment transaction
      await serviceClient.from('wallet_transactions').insert({
        user_id: userId,
        type: 'payment',
        amount: -(moyasarPayment.amount / 100),
        description: booking_type === 'event' 
          ? `دفع حجز فعالية #${booking_id.substring(0, 8)}`
          : `دفع حجز خدمة #${booking_id.substring(0, 8)}`,
        status: 'completed',
        reference_id: booking_id,
        reference_type: booking_type === 'event' ? 'event_booking' : 'service_booking'
      });

      // Send notification
      await serviceClient.from('notifications').insert({
        user_id: userId,
        type: 'payment_success',
        title: 'تم تأكيد الدفع',
        message: `تم تأكيد دفعتك بقيمة ${moyasarPayment.amount / 100} ريال`,
        data: { 
          booking_id,
          payment_id: paymentRecord.provider_payment_id,
          amount: moyasarPayment.amount / 100
        }
      });

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'confirmed',
        message: 'Payment verified and booking confirmed'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } else if (moyasarPayment.status === 'failed') {
      // Update records to failed
      await serviceClient
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentRecord.id);

      await serviceClient
        .from(bookingTable)
        .update({ status: 'failed' })
        .eq('id', booking_id);

      return new Response(JSON.stringify({ 
        success: false, 
        status: 'failed',
        message: 'Payment failed'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } else {
      // Payment still pending
      return new Response(JSON.stringify({ 
        success: false, 
        status: moyasarPayment.status,
        message: `Payment status: ${moyasarPayment.status}`
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    console.error('[verify-payment] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
