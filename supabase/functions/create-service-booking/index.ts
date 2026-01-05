import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  service_id: string;
  service_date: string;
  start_time?: string;
  end_time?: string;
  special_requests?: string;
  quantity?: number; // Number of people booking
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

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BookingRequest = await req.json();
    const { service_id, service_date, start_time, end_time, special_requests, quantity = 1 } = body;

    // Validate required fields
    if (!service_id || !service_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: service_id, service_date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch service details
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total amount based on service pricing
    let totalAmount = 0;
    if (service.price > 0) {
      if (service.availability_type && start_time && end_time) {
        // Hourly pricing
        const [sh, sm] = start_time.split(':').map(Number);
        const [eh, em] = end_time.split(':').map(Number);
        const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
        
        if (durationMinutes <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid time range' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const hourlyRate = service.discount_percentage 
          ? service.price * (1 - service.discount_percentage / 100)
          : service.price;
        totalAmount = hourlyRate * (durationMinutes / 60) * quantity;
      } else {
        // Fixed pricing
        totalAmount = service.price * quantity;
      }
    }

    // Validate capacity if time-based booking
    if (service.availability_type && start_time && end_time) {
      const maxCapacity = service.max_capacity || 1;
      
      // Get existing bookings that overlap with requested time
      const { data: existingBookings } = await supabaseClient
        .from('service_bookings')
        .select('start_time, end_time, quantity')
        .eq('service_id', service_id)
        .eq('service_date', service_date)
        .in('status', ['pending', 'pending_payment', 'confirmed']);

      // Count people (not just bookings) in overlapping slots
      let overlappingPeopleCount = 0;
      (existingBookings || []).forEach(booking => {
        if (!booking.start_time || !booking.end_time) return;
        
        const bStart = String(booking.start_time).slice(0, 5);
        const bEnd = String(booking.end_time).slice(0, 5);
        
        // Check for overlap
        if (bStart < end_time && bEnd > start_time) {
          overlappingPeopleCount += booking.quantity || 1;
        }
      });

      // Check if adding this booking would exceed capacity
      if (overlappingPeopleCount + quantity > maxCapacity) {
        return new Response(
          JSON.stringify({ error: 'Time slot is fully booked' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate booking reference
    const bookingReference = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create the booking
    const bookingData: Record<string, unknown> = {
      service_id,
      user_id: user.id,
      provider_id: service.provider_id,
      booking_date: new Date().toISOString(),
      service_date,
      total_amount: Math.round(totalAmount * 100) / 100,
      special_requests: special_requests || null,
      status: totalAmount === 0 ? 'confirmed' : 'pending_payment',
      booking_reference: bookingReference,
      quantity,
    };

    if (start_time && end_time) {
      bookingData.start_time = `${start_time}:00`;
      bookingData.end_time = `${end_time}:00`;
    }

    const { data: booking, error: bookingError } = await supabaseClient
      .from('service_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      // Check for capacity error from DB trigger
      if (bookingError.message?.includes('fully booked')) {
        return new Response(
          JSON.stringify({ error: 'Time slot is fully booked' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw bookingError;
    }

    // Send notification to provider
    await supabaseClient.from('notifications').insert({
      user_id: service.provider_id,
      type: 'service_booking',
      title: 'حجز خدمة جديد',
      message: `لديك حجز جديد لخدمة ${service.name_ar || service.name}`,
      data: {
        booking_id: booking.id,
        service_id: service_id,
        user_id: user.id,
        booking_date: service_date,
        quantity,
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        requiresPayment: totalAmount > 0
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log to system logs
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseClient.from('system_logs').insert({
      level: 'error',
      message: 'Service booking creation error',
      details: { error: String(error) }
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
