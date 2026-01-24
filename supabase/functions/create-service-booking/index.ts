import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants for VAT-inclusive pricing model
const VAT_RATE = 0.15; // 15% VAT in Saudi Arabia

interface BookingRequest {
  service_id: string;
  service_date: string;
  start_time?: string;
  end_time?: string;
  special_requests?: string;
  quantity?: number;
}

interface CommissionRates {
  events: number;
  services: number;
  training: number;
}

interface FinancialBreakdown {
  totalAmount: number;
  commissionRate: number;
  platformCommission: number;
  vatOnCommission: number;
  netCommission: number;
  providerEarnings: number;
  isDiscounted: boolean;
}

/**
 * Calculate financial breakdown using VAT-inclusive model
 * VAT is extracted from the commission, not added on top
 */
function calculateFinancialBreakdown(
  totalAmount: number,
  commissionRate: number,
  isDiscounted: boolean
): FinancialBreakdown {
  const effectiveRate = isDiscounted ? 0 : commissionRate;
  const platformCommission = (totalAmount * effectiveRate) / 100;
  
  // Extract VAT from commission (VAT is included, not added)
  const vatOnCommission = platformCommission - (platformCommission / (1 + VAT_RATE));
  const netCommission = platformCommission - vatOnCommission;
  const providerEarnings = totalAmount - platformCommission;

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    commissionRate: effectiveRate,
    platformCommission: Math.round(platformCommission * 100) / 100,
    vatOnCommission: Math.round(vatOnCommission * 100) / 100,
    netCommission: Math.round(netCommission * 100) / 100,
    providerEarnings: Math.round(providerEarnings * 100) / 100,
    isDiscounted,
  };
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

/**
 * Generate invoice number for ZATCA compliance
 */
async function generateInvoiceNumber(supabaseClient: any): Promise<string> {
  const { data, error } = await supabaseClient.rpc('generate_invoice_number');
  if (error) {
    // Fallback if function fails
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `INV-${year}-${random}`;
  }
  return data;
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

    // Fetch service details with provider info
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('*, profiles:provider_id(full_name, vat_number)')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      console.error('Service fetch error:', serviceError);
      return new Response(
        JSON.stringify({ error: 'Service not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get commission rates from admin settings
    const commissionRates = await getCommissionRates(supabaseClient);
    
    // Determine service type and if discounted
    const isTrainingService = service.service_type === 'training';
    const isDiscountedService = service.service_type === 'discount' || 
      (service.discount_percentage != null && service.discount_percentage > 0);
    
    // Get applicable commission rate (0 for discounted services)
    const applicableCommissionRate = isDiscountedService 
      ? 0 
      : (isTrainingService ? commissionRates.training : commissionRates.services);

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
        
        // Use discounted price if applicable
        const hourlyRate = service.discount_percentage 
          ? service.price * (1 - service.discount_percentage / 100)
          : service.price;
        totalAmount = hourlyRate * (durationMinutes / 60) * quantity;
      } else {
        // Fixed pricing with discount if applicable
        const effectivePrice = service.discount_percentage
          ? service.price * (1 - service.discount_percentage / 100)
          : service.price;
        totalAmount = effectivePrice * quantity;
      }
    }

    // Calculate complete financial breakdown
    const financialBreakdown = calculateFinancialBreakdown(
      totalAmount,
      applicableCommissionRate,
      isDiscountedService
    );

    console.log('[ServiceBooking] Financial breakdown:', financialBreakdown);

    // Validate capacity if time-based booking
    if (service.availability_type && start_time && end_time) {
      const maxCapacity = service.max_capacity || 1;
      
      const { data: existingBookings } = await supabaseClient
        .from('service_bookings')
        .select('start_time, end_time, quantity')
        .eq('service_id', service_id)
        .eq('service_date', service_date)
        .in('status', ['pending', 'pending_payment', 'confirmed']);

      let overlappingPeopleCount = 0;
      (existingBookings || []).forEach(booking => {
        if (!booking.start_time || !booking.end_time) return;
        
        const bStart = String(booking.start_time).slice(0, 5);
        const bEnd = String(booking.end_time).slice(0, 5);
        
        if (bStart < end_time && bEnd > start_time) {
          overlappingPeopleCount += booking.quantity || 1;
        }
      });

      if (overlappingPeopleCount + quantity > maxCapacity) {
        return new Response(
          JSON.stringify({ error: 'Time slot is fully booked' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate booking reference
    const bookingReference = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create the booking with all financial fields
    const bookingData: Record<string, unknown> = {
      service_id,
      user_id: user.id,
      provider_id: service.provider_id,
      booking_date: new Date().toISOString(),
      service_date,
      total_amount: financialBreakdown.totalAmount,
      commission_rate: financialBreakdown.commissionRate,
      platform_commission: financialBreakdown.platformCommission,
      provider_earnings: financialBreakdown.providerEarnings,
      vat_on_commission: financialBreakdown.vatOnCommission,
      is_discounted: financialBreakdown.isDiscounted,
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
      console.error('Booking creation error:', bookingError);
      if (bookingError.message?.includes('fully booked')) {
        return new Response(
          JSON.stringify({ error: 'Time slot is fully booked' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw bookingError;
    }

    // Create platform invoice record for ZATCA compliance (no API call, just data storage)
    if (financialBreakdown.platformCommission > 0) {
      try {
        const invoiceNumber = await generateInvoiceNumber(supabaseClient);
        
        await supabaseClient.from('platform_invoices').insert({
          invoice_number: invoiceNumber,
          invoice_type: 'simplified',
          reference_type: 'service_booking',
          reference_id: booking.id,
          provider_id: service.provider_id,
          provider_name: service.profiles?.full_name || 'Provider',
          provider_vat_number: service.profiles?.vat_number || null,
          gross_amount: financialBreakdown.totalAmount,
          commission_rate: financialBreakdown.commissionRate,
          commission_amount: financialBreakdown.platformCommission,
          vat_on_commission: financialBreakdown.vatOnCommission,
          net_commission: financialBreakdown.netCommission,
          provider_net_amount: financialBreakdown.providerEarnings,
          status: 'pending', // Will be updated when ZATCA API is integrated
        });
        
        console.log('[ServiceBooking] Invoice record created:', invoiceNumber);
      } catch (invoiceErr) {
        // Log but don't fail the booking if invoice creation fails
        console.error('[ServiceBooking] Invoice creation error:', invoiceErr);
      }
    }

    // Log financial transaction
    await supabaseClient.from('financial_transaction_logs').insert({
      transaction_type: 'service_booking',
      amount: financialBreakdown.totalAmount,
      commission_amount: financialBreakdown.platformCommission,
      vat_amount: financialBreakdown.vatOnCommission,
      net_amount: financialBreakdown.providerEarnings,
      payer_id: user.id,
      receiver_id: service.provider_id,
      reference_type: 'service_booking',
      reference_id: booking.id,
      service_type: service.service_type || 'other',
      status: totalAmount === 0 ? 'completed' : 'pending',
      metadata: {
        service_name: service.name,
        booking_reference: bookingReference,
        quantity,
        is_discounted: financialBreakdown.isDiscounted,
      },
    }).then(({ error }) => { if (error) console.error('Financial log error:', error); });

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
        total_amount: financialBreakdown.totalAmount,
        commission_rate: financialBreakdown.commissionRate,
        platform_commission: financialBreakdown.platformCommission,
        provider_earnings: financialBreakdown.providerEarnings,
        is_discounted: financialBreakdown.isDiscounted,
      }
    }).then(({ error }) => { if (error) console.error('Notification error:', error); });

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        requiresPayment: totalAmount > 0,
        financial: financialBreakdown,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ServiceBooking] Error:', error);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseClient.from('system_logs').insert({
      level: 'error',
      message: 'Service booking creation error',
      details: { error: String(error) }
    }).then(() => {});

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
