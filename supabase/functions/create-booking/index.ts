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
  calculated_total?: number;
  calculated_vat?: number;
}

interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

async function getCommissionRates(supabaseClient: any): Promise<CommissionRates> {
  const defaultRates = { events: 10, services: 10, training: 10 };
  
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['commission_events', 'commission_services', 'commission_training']);

    if (error) return defaultRates;

    const rates = { ...defaultRates };
    
    if (data) {
      data.forEach((item: any) => {
        const value = typeof item.value === 'object' && item.value !== null
          ? item.value.percentage
          : item.value;
        
        const percentage = Number(value) || defaultRates[item.key.replace('commission_', '') as keyof CommissionRates];
        
        if (item.key === 'commission_events') rates.events = percentage;
        if (item.key === 'commission_services') rates.services = percentage;
        if (item.key === 'commission_training') rates.training = percentage;
      });
    }

    return rates;
  } catch (err) {
    console.error('Error fetching commission rates:', err);
    return defaultRates;
  }
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

    const { event_id, quantity, use_points = 0, calculated_total, calculated_vat }: BookingRequest = await req.json();

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

    // Get commission rate from admin settings
    const commissionRates = await getCommissionRates(supabaseClient);
    const eventCommissionRate = commissionRates.events;

    // Calculate pricing - prices are VAT-inclusive
    const ticketPrice = event.price || 0;
    const subtotal = ticketPrice * quantity; // This is the final price (VAT included)
    const vatRate = 0.15;
    // Extract VAT from the inclusive price: VAT = price - (price / 1.15)
    let vatAmount = subtotal - (subtotal / (1 + vatRate));
    
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
    // Use frontend-calculated values if provided (for accurate display consistency)
    let totalAmount = subtotal - discountAmount;
    if (calculated_total !== undefined && calculated_total > 0) {
      totalAmount = calculated_total;
    }
    if (calculated_vat !== undefined && calculated_vat > 0) {
      vatAmount = calculated_vat;
    }

    // Calculate platform commission based on admin-defined rate
    const platformCommission = (totalAmount * eventCommissionRate) / 100;
    const organizerEarnings = totalAmount - platformCommission;

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

    // Return booking with commission info for transparency
    return new Response(JSON.stringify({
      ...booking,
      commission_rate: eventCommissionRate,
      platform_commission: platformCommission,
      organizer_earnings: organizerEarnings,
    }), {
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
