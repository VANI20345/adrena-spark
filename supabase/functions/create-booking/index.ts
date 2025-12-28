import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  event_id: string;
  quantity: number;
  use_points?: number;
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

    const { event_id, quantity, use_points = 0 }: BookingRequest = await req.json();

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check availability
    if (event.max_attendees && (event.current_attendees + quantity > event.max_attendees)) {
      throw new Error('Not enough tickets available');
    }

    // Calculate pricing - prices are VAT-inclusive
    const ticketPrice = event.price || 0;
    const subtotal = ticketPrice * quantity; // This is the final price (VAT included)
    const vatRate = 0.15;
    // Extract VAT from the inclusive price: VAT = price - (price / 1.15)
    const vatAmount = subtotal - (subtotal / (1 + vatRate));
    
    // Apply points discount (1 point = 1 SAR)
    let pointsUsed = 0;
    let discountAmount = 0;
    
    if (use_points > 0) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('points_balance')
        .eq('user_id', user.id)
        .single();

      if (profile && profile.points_balance >= use_points) {
        pointsUsed = Math.min(use_points, subtotal); // Can't use more points than subtotal
        discountAmount = pointsUsed;
      }
    }

    // Total is subtotal minus discounts (VAT already included in price)
    const totalAmount = subtotal - discountAmount;

    // Increment event attendees immediately when booking is created
    await supabaseClient.rpc('increment_event_attendees', {
      event_id: event_id,
      increment_by: quantity
    });
    const bookingReference = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id,
        quantity,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        points_used: pointsUsed,
        vat_amount: vatAmount,
        booking_reference: bookingReference,
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Deduct points if used
    if (pointsUsed > 0) {
      await supabaseClient.from('loyalty_ledger').insert({
        user_id: user.id,
        points: -pointsUsed,
        type: 'redeemed',
        description: `استخدام النقاط للحجز ${bookingReference}`,
        reference_id: booking.id,
        reference_type: 'booking'
      });
    }

    return new Response(JSON.stringify(booking), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Booking creation failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});