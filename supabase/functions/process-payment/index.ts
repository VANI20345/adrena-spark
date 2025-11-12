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
  callback_url: string;
  source: {
    type: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
    name: string;
  };
  booking_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { amount, currency, description, source, booking_id }: PaymentRequest = await req.json();

    // Process payment with Moyasar
    const moyasarResponse = await fetch('https://api.moyasar.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(Deno.env.get('MOYASAR_SECRET_KEY') + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to halalas
        currency,
        description,
        source,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
        metadata: {
          booking_id,
          user_id: user.id
        }
      })
    });

    const paymentResult = await moyasarResponse.json();

    if (paymentResult.status === 'failed') {
      throw new Error(paymentResult.message || 'Payment failed');
    }

    // Update booking status
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .update({ 
        status: 'confirmed',
        payment_id: paymentResult.id
      })
      .eq('id', booking_id)
      .eq('user_id', user.id);

    if (bookingError) throw bookingError;

    // Record payment
    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        booking_id,
        amount: amount,
        status: paymentResult.status,
        payment_method: 'credit_card',
        payment_provider: 'moyasar',
        provider_payment_id: paymentResult.id,
        currency
      });

    if (paymentError) throw paymentError;

    // Generate tickets if payment successful
    if (paymentResult.status === 'paid') {
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select('quantity, event_id')
        .eq('id', booking_id)
        .single();

      if (booking) {
        const tickets = Array.from({ length: booking.quantity }, (_, i) => ({
          booking_id,
          ticket_number: `${booking_id}-${i + 1}`,
          qr_code: `${booking_id}-${i + 1}-${Date.now()}`,
          holder_name: source.name,
          status: 'active'
        }));

        await supabaseClient.from('tickets').insert(tickets);

        // Update event attendee count
        await supabaseClient.rpc('increment_event_attendees', {
          event_id: booking.event_id,
          increment_by: booking.quantity
        });

        // Award loyalty points (1% of amount spent)
        const pointsEarned = Math.floor(amount * 0.01);
        if (pointsEarned > 0) {
          await supabaseClient.from('loyalty_ledger').insert({
            user_id: user.id,
            points: pointsEarned,
            type: 'earned',
            description: `نقاط من الحجز ${booking_id}`,
            reference_id: booking_id,
            reference_type: 'booking'
          });
        }
      }
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Payment processing failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});