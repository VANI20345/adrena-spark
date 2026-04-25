import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[cleanup-expired-bookings] Starting cleanup...');

    // Find all expired pending_payment bookings
    const { data: expiredBookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, event_id, quantity, user_id, booking_reference')
      .eq('status', 'pending_payment')
      .not('reservation_expires_at', 'is', null)
      .lt('reservation_expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[cleanup-expired-bookings] Error fetching expired bookings:', fetchError);
      throw fetchError;
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      console.log('[cleanup-expired-bookings] No expired bookings found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No expired bookings',
        expired_count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[cleanup-expired-bookings] Found ${expiredBookings.length} expired bookings`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const booking of expiredBookings) {
      try {
        // Decrement event attendees count
        const { error: decrementError } = await supabaseClient.rpc('increment_event_attendees', {
          event_id: booking.event_id,
          increment_by: -booking.quantity
        });

        if (decrementError) {
          console.error(`[cleanup-expired-bookings] Error decrementing attendees for booking ${booking.id}:`, decrementError);
          // Continue anyway - we still want to expire the booking
        }

        // Mark booking as expired
        const { error: updateError } = await supabaseClient
          .from('bookings')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`[cleanup-expired-bookings] Error updating booking ${booking.id}:`, updateError);
          errors.push(`Failed to expire booking ${booking.id}`);
          continue;
        }

        // Send notification to user
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            type: 'booking_expired',
            title: 'انتهت صلاحية الحجز',
            message: `انتهت مهلة الدفع لحجزك رقم ${booking.booking_reference}. تم تحرير المقاعد.`,
            data: {
              booking_id: booking.id,
              booking_reference: booking.booking_reference,
              event_id: booking.event_id
            }
          });

        processedCount++;
        console.log(`[cleanup-expired-bookings] Expired booking ${booking.id}`);

      } catch (bookingError) {
        console.error(`[cleanup-expired-bookings] Error processing booking ${booking.id}:`, bookingError);
        errors.push(`Error processing booking ${booking.id}`);
      }
    }

    console.log(`[cleanup-expired-bookings] Cleanup complete. Processed: ${processedCount}, Errors: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${processedCount} expired bookings`,
      expired_count: processedCount,
      total_found: expiredBookings.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[cleanup-expired-bookings] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Cleanup failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
