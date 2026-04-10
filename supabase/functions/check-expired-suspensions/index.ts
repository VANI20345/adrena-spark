import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('[check-expired-suspensions] Checking for expired suspensions...');

    // The database trigger will automatically handle expiration
    // This function is mainly for logging and monitoring
    const { data: expiredUsers, error } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name, suspended_until')
      .eq('suspended', true)
      .not('suspended_until', 'is', null)
      .lt('suspended_until', new Date().toISOString());

    if (error) {
      throw error;
    }

    console.log(`[check-expired-suspensions] Found ${expiredUsers?.length || 0} expired suspensions`);

    if (expiredUsers && expiredUsers.length > 0) {
      // Trigger an update to force the trigger to run
      for (const user of expiredUsers) {
        await supabaseClient
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', user.user_id);
        
        console.log(`[check-expired-suspensions] Auto-unsuspended user: ${user.full_name}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiredCount: expiredUsers?.length || 0 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[check-expired-suspensions] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
