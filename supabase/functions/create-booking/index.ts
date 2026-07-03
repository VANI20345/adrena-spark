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
  pricing_plan_id?: string | null;
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

    const { event_id, quantity, use_points = 0, pricing_plan_id = null }: BookingRequest = await req.json();

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // 24-hour cutoff: disallow bookings for events starting within 24 hours
    if (event.start_date) {
      const startMs = new Date(event.start_date).getTime();
      if (!isNaN(startMs) && startMs - Date.now() < 24 * 60 * 60 * 1000) {
        throw new Error('Bookings are closed: this event starts within 24 hours');
      }
    }

    // Check availability
    if (event.max_attendees && (event.current_attendees + quantity > event.max_attendees)) {
      throw new Error('Not enough tickets available');
    }

    // Get commission rate from admin settings
    const commissionRates = await getCommissionRates(supabaseClient);
    const eventCommissionRate = commissionRates.events;

    // Resolve pricing plan (if any) — plan.price is the TOTAL price for plan.ticket_limit tickets
    let planRow: any = null;
    if (pricing_plan_id) {
      const { data: plan, error: planErr } = await supabaseClient
        .from('pricing_plans')
        .select('*')
        .eq('id', pricing_plan_id)
        .eq('event_id', event_id)
        .maybeSingle();
      if (planErr || !plan) throw new Error('Pricing plan not found');
      if (plan.ticket_limit !== quantity) {
        throw new Error('Ticket quantity does not match the selected pricing plan');
      }
      if (plan.available_tickets != null && plan.available_tickets < quantity) {
        throw new Error('Selected pricing plan is sold out');
      }
      planRow = plan;
    }

    // Calculate pricing - prices are VAT-inclusive (SOURCE OF TRUTH: backend only)
    const ticketPrice = Number(event.price) || 0;
    const subtotal = planRow
      ? Number(planRow.price) || 0
      : ticketPrice * quantity;
    const vatRate = 0.15;

    // Apply points discount (1 point = 1 SAR) — RESERVED only, not yet deducted from ledger
    let pointsUsed = 0;
    let discountAmount = 0;
    if (use_points > 0) {
      const { data: gamification } = await supabaseClient
        .from('user_gamification')
        .select('points_balance')
        .eq('user_id', user.id)
        .single();
      if (gamification && gamification.points_balance >= use_points) {
        pointsUsed = Math.min(use_points, subtotal);
        discountAmount = pointsUsed;
      }
    }

    const totalAmount = subtotal - discountAmount;
    const isFreeBooking = totalAmount === 0;

    // Unified financial model:
    //   vat_amount = total * 15/115   (VAT-inclusive)
    //   net_amount = total - vat
    //   platform_commission = net * rate%
    //   provider_earnings   = net - commission
    // Business model: prices are VAT-inclusive. Commission is computed on total_amount.
    //   platform_commission = total * rate%
    //   provider_earnings   = total - platform_commission
    //   vat_amount          = total * 15/115 (informational only)
    let vatAmount = 0;
    let platformCommission = 0;
    let organizerEarnings = 0;
    if (!isFreeBooking) {
      vatAmount = Math.round((totalAmount * vatRate / (1 + vatRate)) * 100) / 100;
      platformCommission = Math.round((totalAmount * eventCommissionRate / 100) * 100) / 100;
      organizerEarnings = Math.round((totalAmount - platformCommission) * 100) / 100;
    }

    // Increment event attendees immediately when booking is created
    await supabaseClient.rpc('increment_event_attendees', {
      event_id: event_id,
      increment_by: quantity
    });
    const bookingReference = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // For free events (total = 0), set status to 'confirmed' immediately.
    // For paid events, reserve the seat for 15 minutes as "pending_payment".
    // The cleanup edge function releases the seat if payment is not completed.
    const bookingStatus = isFreeBooking ? 'confirmed' : 'pending_payment';
    const reservationExpiresAt = isFreeBooking
      ? null
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Create booking with appropriate status based on price
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
        status: bookingStatus,
        reservation_expires_at: reservationExpiresAt,
        commission_rate: isFreeBooking ? 0 : eventCommissionRate,
        platform_commission: platformCommission,
        provider_earnings: organizerEarnings
      })
      .select()
      .single();

    if (bookingError) {
      // Roll back the seat reservation so capacity isn't leaked.
      await supabaseClient.rpc('increment_event_attendees', {
        event_id: event_id,
        increment_by: -quantity
      });
      throw bookingError;
    }

    // Free bookings still run the paid-booking confirmation pipeline so tickets,
    // loyalty-earn, financial log and notifications are created consistently.
    if (isFreeBooking) {
      const freePaymentRef = `FREE-${booking.id}`;
      const { error: confirmErr } = await supabaseClient.rpc('confirm_paid_booking', {
        p_booking_id: booking.id,
        p_booking_type: 'event',
        p_payment_id: freePaymentRef,
        p_provider_amount_halalas: 0,
      });
      if (confirmErr) {
        console.error('[create-booking] free-booking confirm error:', confirmErr);
      }
    }

    // NOTE: Points are NOT deducted here. Deduction happens atomically inside
    // confirm_paid_booking after a successful payment. This prevents users from
    // losing points on expired/failed reservations.

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
