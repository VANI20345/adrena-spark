import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // STRICT: only accept a valid x-internal-secret. Anon apikey is no longer accepted.
    const expected = Deno.env.get('INTERNAL_SECRET');
    const provided = req.headers.get('x-internal-secret');
    if (!expected || !provided || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing x-internal-secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Atomic RPC handles event + service bookings, attendee release, and notifications.
    const { data, error } = await supabaseClient.rpc('cleanup_expired_booking_reservations');
    if (error) {
      console.error('[cleanup-expired-bookings] RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also clean up payments stuck in 'pending' for >24h.
    const { data: stale, error: staleErr } = await supabaseClient.rpc('cleanup_stale_pending_payments');
    if (staleErr) {
      console.error('[cleanup-expired-bookings] stale payments cleanup error:', staleErr);
    }

    return new Response(JSON.stringify({
      success: true,
      expired_bookings: data ?? 0,
      stale_payments: stale ?? null,
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
