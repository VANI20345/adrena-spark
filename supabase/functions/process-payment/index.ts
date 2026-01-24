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
  frontend_origin: string;
  source: {
    type: string;
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

const DEFAULT_RATES: CommissionRates = {
  events: 10,
  services: 10,
  training: 10,
};

// Fetch commission rates from database
async function getCommissionRates(supabaseClient: any): Promise<CommissionRates> {
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['commission_events', 'commission_services', 'commission_training']);

    if (error) throw error;

    const rates = { ...DEFAULT_RATES };
    
    if (data) {
      data.forEach((item: any) => {
        const value = typeof item.value === 'object' && item.value !== null
          ? item.value.percentage
          : item.value;
        
        const percentage = Number(value) || DEFAULT_RATES[item.key.replace('commission_', '') as keyof CommissionRates];
        
        if (item.key === 'commission_events') rates.events = percentage;
        if (item.key === 'commission_services') rates.services = percentage;
        if (item.key === 'commission_training') rates.training = percentage;
      });
    }

    return rates;
  } catch (err) {
    console.error('Error fetching commission rates:', err);
    return DEFAULT_RATES;
  }
}

// Calculate financial breakdown
function calculateFinancialBreakdown(totalAmount: number, commissionRate: number, isDiscounted: boolean = false) {
  const VAT_RATE = 0.15;
  const effectiveCommissionRate = isDiscounted ? 0 : commissionRate;
  const platformCommission = (totalAmount * effectiveCommissionRate) / 100;
  const vatOnCommission = platformCommission - (platformCommission / (1 + VAT_RATE));
  const netCommission = platformCommission - vatOnCommission;
  const providerEarnings = totalAmount - platformCommission;
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    commissionRate: effectiveCommissionRate,
    platformCommission: Math.round(platformCommission * 100) / 100,
    vatOnCommission: Math.round(vatOnCommission * 100) / 100,
    netCommission: Math.round(netCommission * 100) / 100,
    providerEarnings: Math.round(providerEarnings * 100) / 100,
    isDiscounted,
  };
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

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const { amount, currency, description, source, booking_id, booking_type = 'event', frontend_origin }: PaymentRequest = await req.json();

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify booking exists and belongs to user
    const bookingTable = booking_type === 'service' ? 'service_bookings' : 'bookings';
    
    let bookingQuery;
    if (booking_type === 'service') {
      bookingQuery = supabaseClient
        .from('service_bookings')
        .select(`
          id, user_id, total_amount, status, provider_id, service_id, is_discounted,
          services!service_id(service_type, provider_id)
        `)
        .eq('id', booking_id)
        .single();
    } else {
      bookingQuery = supabaseClient
        .from('bookings')
        .select(`
          id, user_id, total_amount, status, event_id,
          events!event_id(organizer_id)
        `)
        .eq('id', booking_id)
        .single();
    }

    const { data: booking, error: bookingError } = await bookingQuery;

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized - booking does not belong to user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify amount matches booking (allow 1 riyal tolerance for rounding)
    if (Math.abs(Number(booking.total_amount) - amount) > 1) {
      console.error('Amount mismatch:', { booking_amount: booking.total_amount, requested_amount: amount });
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get provider ID and determine commission type
    let providerId: string = '';
    let commissionType: keyof CommissionRates = 'services';
    let isDiscounted = false;

    if (booking_type === 'service') {
      const serviceBooking = booking as any;
      providerId = serviceBooking.provider_id || serviceBooking.services?.provider_id;
      const serviceType = serviceBooking.services?.service_type || 'other';
      isDiscounted = serviceBooking.is_discounted || serviceType === 'discount';
      commissionType = serviceType === 'training' ? 'training' : 'services';
    } else {
      const eventBooking = booking as any;
      providerId = eventBooking.events?.organizer_id;
      commissionType = 'events';
    }

    // Get commission rates
    const commissionRates = await getCommissionRates(supabaseClient);
    const commissionRate = commissionRates[commissionType];
    
    // Calculate financial breakdown
    const breakdown = calculateFinancialBreakdown(amount, commissionRate, isDiscounted);

    console.log('[process-payment] Financial breakdown:', {
      booking_id,
      booking_type,
      providerId,
      commissionType,
      isDiscounted,
      breakdown
    });

    // Update booking with commission details
    const { error: updateError } = await supabaseClient
      .from(bookingTable)
      .update({
        commission_rate: breakdown.commissionRate,
        platform_commission: breakdown.platformCommission,
        provider_earnings: breakdown.providerEarnings,
        vat_on_commission: breakdown.vatOnCommission,
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking with commission:', updateError);
    }

    // Get Moyasar secret key
    const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    if (!moyasarSecretKey) {
      console.error('MOYASAR_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct callback URL for 3DS redirect
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const encodedOrigin = encodeURIComponent(frontend_origin || Deno.env.get('SITE_URL') || 'https://lovable.dev');
    const webhookUrl = `${supabaseUrl}/functions/v1/payment-webhook?booking_id=${booking_id}&booking_type=${booking_type}&origin=${encodedOrigin}&provider_id=${providerId}`;

    // Process payment with Moyasar
    const moyasarResponse = await fetch('https://api.moyasar.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to halalas (cents)
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
        callback_url: webhookUrl,
        metadata: {
          booking_id,
          user_id: userId,
          booking_type,
          provider_id: providerId,
          commission_rate: breakdown.commissionRate,
          platform_commission: breakdown.platformCommission,
          provider_earnings: breakdown.providerEarnings,
        }
      })
    });

    const paymentResult = await moyasarResponse.json();

    if (!moyasarResponse.ok) {
      console.error('Moyasar API error:', paymentResult);
      const errorMessage = paymentResult.message || paymentResult.errors?.[0]?.message || 'Payment processing failed';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record payment in database
    const { error: paymentRecordError } = await supabaseClient
      .from('payments')
      .insert({
        booking_id,
        amount: amount,
        status: paymentResult.status === 'paid' ? 'completed' : 'pending',
        payment_method: 'credit_card',
        payment_provider: 'moyasar',
        provider_payment_id: paymentResult.id,
        currency: currency || 'SAR'
      });

    if (paymentRecordError) {
      console.error('Failed to record payment:', paymentRecordError);
    }

    // If payment is immediately successful (no 3DS required)
    if (paymentResult.status === 'paid') {
      await processSuccessfulPayment(
        supabaseClient,
        booking_id,
        booking_type,
        userId,
        providerId,
        amount,
        breakdown,
        paymentResult.id,
        source.name
      );
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Payment processing failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Process successful payment - update statuses, credit wallets, log transactions
async function processSuccessfulPayment(
  supabaseClient: any,
  bookingId: string,
  bookingType: string,
  userId: string,
  providerId: string,
  amount: number,
  breakdown: ReturnType<typeof calculateFinancialBreakdown>,
  paymentId: string,
  payerName: string
) {
  const bookingTable = bookingType === 'service' ? 'service_bookings' : 'bookings';

  // Update booking status
  const { error: bookingUpdateError } = await supabaseClient
    .from(bookingTable)
    .update({ 
      status: 'confirmed',
      payment_id: paymentId
    })
    .eq('id', bookingId);

  if (bookingUpdateError) {
    console.error('Failed to update booking:', bookingUpdateError);
  }

  // For event bookings, generate tickets and update attendee count
  if (bookingType === 'event') {
    const { data: eventBooking } = await supabaseClient
      .from('bookings')
      .select('quantity, event_id')
      .eq('id', bookingId)
      .single();

    if (eventBooking) {
      // Generate tickets
      const tickets = Array.from({ length: eventBooking.quantity }, (_, i) => ({
        booking_id: bookingId,
        ticket_number: `${bookingId.substring(0, 8)}-${i + 1}`,
        qr_code: `${bookingId}-${i + 1}-${Date.now()}`,
        holder_name: payerName,
        status: 'active'
      }));

      await supabaseClient.from('tickets').insert(tickets);

      // Update event attendee count
      await supabaseClient.rpc('increment_event_attendees', {
        event_id: eventBooking.event_id,
        increment_by: eventBooking.quantity
      });
    }
  }

  // Credit provider wallet with their earnings
  if (providerId && breakdown.providerEarnings > 0) {
    await creditProviderWallet(
      supabaseClient,
      providerId,
      breakdown.providerEarnings,
      bookingId,
      bookingType
    );
  }

  // Record wallet transaction for the user (payment/debit)
  await supabaseClient.from('wallet_transactions').insert({
    user_id: userId,
    type: 'payment',
    amount: -amount, // Negative for payment/debit
    description: bookingType === 'event' 
      ? `دفع حجز فعالية #${bookingId.substring(0, 8)}`
      : `دفع حجز خدمة #${bookingId.substring(0, 8)}`,
    status: 'completed',
    reference_id: bookingId,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
  });

  // Record financial transaction log for auditing
  await supabaseClient.from('financial_transaction_logs').insert({
    transaction_type: 'booking_payment',
    amount: amount,
    commission_amount: breakdown.platformCommission,
    vat_amount: breakdown.vatOnCommission,
    net_amount: breakdown.providerEarnings,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
    reference_id: bookingId,
    payer_id: userId,
    receiver_id: providerId,
    status: 'completed',
    service_type: bookingType,
    metadata: {
      payment_id: paymentId,
      commission_rate: breakdown.commissionRate,
      is_discounted: breakdown.isDiscounted
    }
  });

  // Log activity for user feed
  await logBookingActivity(supabaseClient, userId, bookingId, bookingType);

  // Award loyalty points (1% of amount spent)
  const pointsEarned = Math.floor(amount * 0.01);
  if (pointsEarned > 0) {
    await supabaseClient.from('loyalty_ledger').insert({
      user_id: userId,
      points: pointsEarned,
      type: 'earned',
      description: `نقاط من الحجز ${bookingId.substring(0, 8)}`,
      reference_id: bookingId,
      reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
    });
  }

  // Send confirmation notification
  await supabaseClient.from('notifications').insert({
    user_id: userId,
    type: 'payment_success',
    title: 'تم الدفع بنجاح',
    message: `تم استلام دفعتك بقيمة ${amount} ريال`,
    data: { 
      booking_id: bookingId,
      payment_id: paymentId,
      amount,
      booking_type: bookingType,
      provider_earnings: breakdown.providerEarnings,
      platform_commission: breakdown.platformCommission
    }
  });

  console.log('[process-payment] Payment processed successfully:', {
    bookingId,
    bookingType,
    providerId,
    providerEarnings: breakdown.providerEarnings,
    platformCommission: breakdown.platformCommission
  });
}

// Credit provider wallet with earnings
async function creditProviderWallet(
  supabaseClient: any,
  providerId: string,
  amount: number,
  bookingId: string,
  bookingType: string
) {
  // Check if wallet exists, create if not
  const { data: wallet, error: walletError } = await supabaseClient
    .from('user_wallets')
    .select('id, balance, total_earned, total_service_revenue')
    .eq('user_id', providerId)
    .maybeSingle();

  if (walletError) {
    console.error('Error fetching provider wallet:', walletError);
    return;
  }

  if (!wallet) {
    // Create new wallet for provider
    const { error: createError } = await supabaseClient
      .from('user_wallets')
      .insert({
        user_id: providerId,
        balance: amount,
        total_earned: amount,
        total_service_revenue: bookingType === 'service' ? amount : 0,
        pending_earnings: 0,
        total_withdrawn: 0
      });

    if (createError) {
      console.error('Error creating provider wallet:', createError);
      return;
    }
  } else {
    // Update existing wallet
    const { error: updateError } = await supabaseClient
      .from('user_wallets')
      .update({
        balance: wallet.balance + amount,
        total_earned: wallet.total_earned + amount,
        total_service_revenue: (wallet.total_service_revenue || 0) + (bookingType === 'service' ? amount : 0),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', providerId);

    if (updateError) {
      console.error('Error updating provider wallet:', updateError);
      return;
    }
  }

  // Record earning transaction for provider
  await supabaseClient.from('wallet_transactions').insert({
    user_id: providerId,
    type: 'earning',
    amount: amount, // Positive for earning/credit
    description: bookingType === 'event' 
      ? `إيراد من حجز فعالية #${bookingId.substring(0, 8)}`
      : `إيراد من حجز خدمة #${bookingId.substring(0, 8)}`,
    status: 'completed',
    reference_id: bookingId,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
  });

  // Send notification to provider about new earning
  await supabaseClient.from('notifications').insert({
    user_id: providerId,
    type: 'earning_received',
    title: 'تم استلام إيراد جديد',
    message: `تم إضافة ${amount} ريال إلى محفظتك من حجز جديد`,
    data: { 
      booking_id: bookingId,
      amount,
      booking_type: bookingType
    }
  });

  console.log('[process-payment] Provider wallet credited:', { providerId, amount, bookingId });
}

// Log booking activity to activity_logs for user feed
async function logBookingActivity(
  supabaseClient: any,
  userId: string,
  bookingId: string,
  bookingType: string
) {
  try {
    let entityData: any = {};
    let entityId: string = bookingId;

    if (bookingType === 'event') {
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select(`
          id, event_id,
          events!event_id(id, title, title_ar, image_url, location_ar)
        `)
        .eq('id', bookingId)
        .single();

      if (booking?.events) {
        entityId = booking.event_id;
        entityData = {
          id: booking.events.id,
          title: booking.events.title,
          title_ar: booking.events.title_ar,
          image_url: booking.events.image_url,
          location_ar: booking.events.location_ar
        };
      }
    } else {
      const { data: booking } = await supabaseClient
        .from('service_bookings')
        .select(`
          id, service_id,
          services!service_id(id, name, name_ar, image_url, service_type)
        `)
        .eq('id', bookingId)
        .single();

      if (booking?.services) {
        entityId = booking.service_id;
        entityData = {
          id: booking.services.id,
          name: booking.services.name,
          name_ar: booking.services.name_ar,
          image_url: booking.services.image_url,
          service_type: booking.services.service_type
        };
      }
    }

    await supabaseClient.from('activity_logs').insert({
      actor_id: userId,
      activity_type: bookingType === 'event' ? 'booked_event' : 'booked_service',
      entity_type: bookingType === 'event' ? 'event' : 'service',
      entity_id: entityId,
      entity_data: entityData,
      visibility: 'followers'
    });

    console.log('[process-payment] Activity logged for user:', userId);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
