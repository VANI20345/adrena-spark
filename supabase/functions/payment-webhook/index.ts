import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookPayload {
  type: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    metadata: {
      booking_id: string;
      user_id: string;
      booking_type?: string;
      provider_id?: string;
      commission_rate?: number;
      platform_commission?: number;
      provider_earnings?: number;
    };
  };
}

// HMAC signature verification for webhook security
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (computedSignature.length !== signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

// Verify payment status directly with payment provider (Moyasar)
async function verifyPaymentWithProvider(
  paymentId: string,
  expectedStatus: string
): Promise<{ valid: boolean; amount?: number; metadata?: any }> {
  const moyasarSecretKey = Deno.env.get('MOYASAR_SECRET_KEY');
  if (!moyasarSecretKey) {
    return { valid: false };
  }

  try {
    const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${btoa(moyasarSecretKey + ':')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { valid: false };
    }

    const paymentData = await response.json();
    return { 
      valid: paymentData.status === expectedStatus,
      amount: paymentData.amount,
      metadata: paymentData.metadata
    };
  } catch {
    return { valid: false };
  }
}

// Calculate financial breakdown
function calculateFinancialBreakdown(totalAmount: number, commissionRate: number, isDiscounted: boolean = false) {
  const VAT_RATE = 0.15;
  const effectiveCommissionRate = isDiscounted ? 0 : commissionRate;
  const platformCommission = (totalAmount * effectiveCommissionRate) / 100;
  const vatOnCommission = platformCommission - (platformCommission / (1 + VAT_RATE));
  const providerEarnings = totalAmount - platformCommission;
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    commissionRate: effectiveCommissionRate,
    platformCommission: Math.round(platformCommission * 100) / 100,
    vatOnCommission: Math.round(vatOnCommission * 100) / 100,
    providerEarnings: Math.round(providerEarnings * 100) / 100,
    isDiscounted,
  };
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (3DS redirect callback from Moyasar)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('id');
    const status = url.searchParams.get('status');
    const message = url.searchParams.get('message');
    const bookingId = url.searchParams.get('booking_id');
    const bookingType = url.searchParams.get('booking_type') || 'event';
    const providerId = url.searchParams.get('provider_id');
    
    const frontendOrigin = url.searchParams.get('origin');
    const siteUrl = frontendOrigin ? decodeURIComponent(frontendOrigin) : (Deno.env.get('SITE_URL') || 'https://lovable.dev');
    
    console.log('[payment-webhook] 3DS redirect - status:', status, 'bookingId:', bookingId, 'providerId:', providerId);
    
    // If payment was successful via 3DS, process the payment completion
    if (status === 'paid' && bookingId && paymentId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Verify payment with Moyasar
        const verification = await verifyPaymentWithProvider(paymentId, 'paid');
        
        if (verification.valid) {
          await process3DSPaymentSuccess(
            supabaseClient,
            bookingId,
            bookingType,
            providerId || '',
            paymentId,
            verification.amount ? verification.amount / 100 : 0, // Convert from halalas
            verification.metadata
          );
        }
      } catch (error) {
        console.error('[payment-webhook] Error processing 3DS payment:', error);
      }
    }
    
    // Redirect based on payment status
    if (status === 'paid') {
      const redirectUrl = new URL(siteUrl);
      if (bookingType === 'service') {
        redirectUrl.pathname = '/service-checkout/success';
      } else {
        redirectUrl.pathname = '/checkout/success';
      }
      redirectUrl.searchParams.set('payment_id', paymentId || '');
      redirectUrl.searchParams.set('booking_id', bookingId || '');
      redirectUrl.searchParams.set('from_3ds', 'true');
      
      console.log('[payment-webhook] Redirecting to success:', redirectUrl.toString());
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          ...corsHeaders
        }
      });
    } else {
      const redirectUrl = new URL(siteUrl);
      redirectUrl.pathname = '/checkout/callback';
      redirectUrl.searchParams.set('payment_id', paymentId || '');
      redirectUrl.searchParams.set('status', status || 'failed');
      redirectUrl.searchParams.set('booking_id', bookingId || '');
      redirectUrl.searchParams.set('booking_type', bookingType);
      if (message) redirectUrl.searchParams.set('message', message);
      
      console.log('[payment-webhook] Redirecting to callback:', redirectUrl.toString());
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          ...corsHeaders
        }
      });
    }
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawBody = await req.text();
    
    if (!rawBody || rawBody.trim() === '') {
      console.log('[payment-webhook] Empty body received');
      return new Response(JSON.stringify({ success: true, message: 'OK' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const webhookSignature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    if (webhookSecret) {
      const isValidSignature = await verifyWebhookSignature(rawBody, webhookSignature, webhookSecret);
      if (!isValidSignature) {
        console.error('[payment-webhook] Invalid signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[payment-webhook] Failed to parse JSON:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { type, data } = payload;
    const expectedStatus = type === 'payment_paid' ? 'paid' : 'failed';
    const providerVerification = await verifyPaymentWithProvider(data.id, expectedStatus);
    
    if (!providerVerification.valid) {
      console.error('[payment-webhook] Payment verification failed');
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (data.metadata?.booking_id) {
      const bookingType = data.metadata.booking_type || 'event';
      const bookingTable = bookingType === 'service' ? 'service_bookings' : 'bookings';

      const { data: booking, error: bookingError } = await supabaseClient
        .from(bookingTable)
        .select('user_id, total_amount, status, provider_id, provider_earnings, platform_commission, commission_rate')
        .eq('id', data.metadata.booking_id)
        .single();

      if (bookingError || !booking) {
        console.error('[payment-webhook] Booking not found:', data.metadata.booking_id);
        return new Response(JSON.stringify({ error: 'Booking not found' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (data.metadata.user_id && booking.user_id !== data.metadata.user_id) {
        console.error('[payment-webhook] User ID mismatch');
        return new Response(JSON.stringify({ error: 'Metadata mismatch' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const expectedAmount = Math.round(booking.total_amount * 100);
      const actualAmount = providerVerification.amount || data.amount;
      
      if (Math.abs(expectedAmount - actualAmount) > 1) {
        console.error('[payment-webhook] Amount mismatch');
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (booking.status === 'confirmed' && type === 'payment_paid') {
        console.log('[payment-webhook] Booking already confirmed');
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validatedUserId = booking.user_id;

      if (type === 'payment_paid') {
        // Update payment status
        await supabaseClient
          .from('payments')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('provider_payment_id', data.id);

        // Update booking status
        await supabaseClient
          .from(bookingTable)
          .update({ status: 'confirmed' })
          .eq('id', data.metadata.booking_id);

        // Process wallet and transaction logging
        const providerId = data.metadata.provider_id || booking.provider_id;
        const providerEarnings = booking.provider_earnings || data.metadata.provider_earnings || 0;
        const platformCommission = booking.platform_commission || data.metadata.platform_commission || 0;
        const commissionRate = booking.commission_rate || data.metadata.commission_rate || 0;

        if (providerId && providerEarnings > 0) {
          await creditProviderWallet(
            supabaseClient,
            providerId,
            providerEarnings,
            data.metadata.booking_id,
            bookingType
          );
        }

        // Log user payment transaction
        await supabaseClient.from('wallet_transactions').insert({
          user_id: validatedUserId,
          type: 'payment',
          amount: -(actualAmount / 100),
          description: bookingType === 'event' 
            ? `دفع حجز فعالية #${data.metadata.booking_id.substring(0, 8)}`
            : `دفع حجز خدمة #${data.metadata.booking_id.substring(0, 8)}`,
          status: 'completed',
          reference_id: data.metadata.booking_id,
          reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
        });

        // Log financial transaction
        await supabaseClient.from('financial_transaction_logs').insert({
          transaction_type: 'booking_payment',
          amount: actualAmount / 100,
          commission_amount: platformCommission,
          vat_amount: platformCommission * 0.15 / 1.15,
          net_amount: providerEarnings,
          reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
          reference_id: data.metadata.booking_id,
          payer_id: validatedUserId,
          receiver_id: providerId,
          status: 'completed',
          service_type: bookingType,
          metadata: {
            payment_id: data.id,
            commission_rate: commissionRate,
            webhook_processed: true
          }
        });

        // Log activity for user feed
        await logBookingActivity(supabaseClient, validatedUserId, data.metadata.booking_id, bookingType);

        // Award loyalty points
        const pointsEarned = Math.floor((actualAmount / 100) * 0.01);
        if (pointsEarned > 0) {
          await supabaseClient.from('loyalty_ledger').insert({
            user_id: validatedUserId,
            points: pointsEarned,
            type: 'earned',
            description: `نقاط من الحجز ${data.metadata.booking_id.substring(0, 8)}`,
            reference_id: data.metadata.booking_id,
            reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
          });
        }

        // Send notification
        await supabaseClient.from('notifications').insert({
          user_id: validatedUserId,
          type: 'payment_success',
          title: 'تم الدفع بنجاح',
          message: `تم استلام دفعتك بقيمة ${actualAmount / 100} ريال`,
          data: { 
            booking_id: data.metadata.booking_id,
            payment_id: data.id,
            amount: actualAmount / 100
          }
        });

        console.log('[payment-webhook] Payment processed successfully');

      } else if (type === 'payment_failed') {
        await supabaseClient
          .from('payments')
          .update({ status: 'failed' })
          .eq('provider_payment_id', data.id);

        await supabaseClient
          .from(bookingTable)
          .update({ status: 'failed' })
          .eq('id', data.metadata.booking_id);

        await supabaseClient.from('notifications').insert({
          user_id: validatedUserId,
          type: 'payment_failed',
          title: 'فشل في الدفع',
          message: 'لم نتمكن من معالجة دفعتك. يرجى المحاولة مرة أخرى.',
          data: { 
            booking_id: data.metadata.booking_id,
            payment_id: data.id
          }
        });

        console.log('[payment-webhook] Payment failure processed');
      }
    } else {
      console.error('[payment-webhook] Missing booking_id in metadata');
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[payment-webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Process 3DS payment success
async function process3DSPaymentSuccess(
  supabaseClient: any,
  bookingId: string,
  bookingType: string,
  providerId: string,
  paymentId: string,
  amount: number,
  metadata: any
) {
  const bookingTable = bookingType === 'service' ? 'service_bookings' : 'bookings';

  // Get booking details
  const { data: booking, error } = await supabaseClient
    .from(bookingTable)
    .select('user_id, total_amount, status, provider_id, provider_earnings, platform_commission, commission_rate')
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    console.error('[payment-webhook] Booking not found for 3DS:', bookingId);
    return;
  }

  if (booking.status === 'confirmed') {
    console.log('[payment-webhook] 3DS booking already processed:', bookingId);
    return;
  }

  // Update booking status
  await supabaseClient
    .from(bookingTable)
    .update({ status: 'confirmed', payment_id: paymentId })
    .eq('id', bookingId);

  // Update payment status
  await supabaseClient
    .from('payments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('provider_payment_id', paymentId);

  const finalProviderId = providerId || booking.provider_id || metadata?.provider_id;
  const providerEarnings = booking.provider_earnings || metadata?.provider_earnings || 0;

  // Credit provider wallet
  if (finalProviderId && providerEarnings > 0) {
    await creditProviderWallet(supabaseClient, finalProviderId, providerEarnings, bookingId, bookingType);
  }

  // Log payment transaction for user
  await supabaseClient.from('wallet_transactions').insert({
    user_id: booking.user_id,
    type: 'payment',
    amount: -amount,
    description: bookingType === 'event' 
      ? `دفع حجز فعالية #${bookingId.substring(0, 8)}`
      : `دفع حجز خدمة #${bookingId.substring(0, 8)}`,
    status: 'completed',
    reference_id: bookingId,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
  });

  // Log financial transaction
  await supabaseClient.from('financial_transaction_logs').insert({
    transaction_type: 'booking_payment',
    amount: amount,
    commission_amount: booking.platform_commission || 0,
    vat_amount: (booking.platform_commission || 0) * 0.15 / 1.15,
    net_amount: providerEarnings,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking',
    reference_id: bookingId,
    payer_id: booking.user_id,
    receiver_id: finalProviderId,
    status: 'completed',
    service_type: bookingType,
    metadata: { payment_id: paymentId, from_3ds: true }
  });

  // Log activity
  await logBookingActivity(supabaseClient, booking.user_id, bookingId, bookingType);

  // Award loyalty points
  const pointsEarned = Math.floor(amount * 0.01);
  if (pointsEarned > 0) {
    await supabaseClient.from('loyalty_ledger').insert({
      user_id: booking.user_id,
      points: pointsEarned,
      type: 'earned',
      description: `نقاط من الحجز ${bookingId.substring(0, 8)}`,
      reference_id: bookingId,
      reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
    });
  }

  // For event bookings, generate tickets
  if (bookingType === 'event') {
    const { data: eventBooking } = await supabaseClient
      .from('bookings')
      .select('quantity, event_id')
      .eq('id', bookingId)
      .single();

    if (eventBooking) {
      const tickets = Array.from({ length: eventBooking.quantity }, (_, i) => ({
        booking_id: bookingId,
        ticket_number: `${bookingId.substring(0, 8)}-${i + 1}`,
        qr_code: `${bookingId}-${i + 1}-${Date.now()}`,
        holder_name: 'Guest',
        status: 'active'
      }));

      await supabaseClient.from('tickets').insert(tickets);
      await supabaseClient.rpc('increment_event_attendees', {
        event_id: eventBooking.event_id,
        increment_by: eventBooking.quantity
      });
    }
  }

  // Send notification
  await supabaseClient.from('notifications').insert({
    user_id: booking.user_id,
    type: 'payment_success',
    title: 'تم الدفع بنجاح',
    message: `تم استلام دفعتك بقيمة ${amount} ريال`,
    data: { booking_id: bookingId, payment_id: paymentId, amount }
  });

  console.log('[payment-webhook] 3DS payment processed:', { bookingId, amount, providerId: finalProviderId });
}

// Credit provider wallet
async function creditProviderWallet(
  supabaseClient: any,
  providerId: string,
  amount: number,
  bookingId: string,
  bookingType: string
) {
  const { data: wallet } = await supabaseClient
    .from('user_wallets')
    .select('id, balance, total_earned, total_service_revenue')
    .eq('user_id', providerId)
    .maybeSingle();

  if (!wallet) {
    await supabaseClient.from('user_wallets').insert({
      user_id: providerId,
      balance: amount,
      total_earned: amount,
      total_service_revenue: bookingType === 'service' ? amount : 0,
      pending_earnings: 0,
      total_withdrawn: 0
    });
  } else {
    await supabaseClient.from('user_wallets').update({
      balance: wallet.balance + amount,
      total_earned: wallet.total_earned + amount,
      total_service_revenue: (wallet.total_service_revenue || 0) + (bookingType === 'service' ? amount : 0),
      updated_at: new Date().toISOString()
    }).eq('user_id', providerId);
  }

  // Record earning transaction
  await supabaseClient.from('wallet_transactions').insert({
    user_id: providerId,
    type: 'earning',
    amount: amount,
    description: bookingType === 'event' 
      ? `إيراد من حجز فعالية #${bookingId.substring(0, 8)}`
      : `إيراد من حجز خدمة #${bookingId.substring(0, 8)}`,
    status: 'completed',
    reference_id: bookingId,
    reference_type: bookingType === 'event' ? 'event_booking' : 'service_booking'
  });

  // Notify provider
  await supabaseClient.from('notifications').insert({
    user_id: providerId,
    type: 'earning_received',
    title: 'تم استلام إيراد جديد',
    message: `تم إضافة ${amount} ريال إلى محفظتك من حجز جديد`,
    data: { booking_id: bookingId, amount, booking_type: bookingType }
  });

  console.log('[payment-webhook] Provider wallet credited:', { providerId, amount });
}

// Log booking activity
async function logBookingActivity(
  supabaseClient: any,
  userId: string,
  bookingId: string,
  bookingType: string
) {
  try {
    let entityData: any = {};
    let entityId = bookingId;

    if (bookingType === 'event') {
      const { data: booking } = await supabaseClient
        .from('bookings')
        .select(`id, event_id, events!event_id(id, title, title_ar, image_url, location_ar)`)
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
        .select(`id, service_id, services!service_id(id, name, name_ar, image_url, service_type)`)
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
  } catch (error) {
    console.error('[payment-webhook] Error logging activity:', error);
  }
}
