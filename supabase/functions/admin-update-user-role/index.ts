import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AppRole = 'attendee' | 'provider' | 'admin';

interface UpdateRoleRequest {
  userId: string;
  role: AppRole;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, role } = await req.json() as UpdateRoleRequest;

    if (!userId || !role) {
      return new Response(JSON.stringify({ error: 'userId and role are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const validRoles: AppRole[] = ['attendee', 'provider', 'admin'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if the record exists
    const { data: existing, error: fetchError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      if (insertError) throw insertError;
    }

    console.log(`[admin-update-user-role] Updated role for user ${userId} to ${role}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[admin-update-user-role] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
