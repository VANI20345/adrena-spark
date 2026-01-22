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
    // Extract and validate the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-update-user-role] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

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

    // Create a client with the user's token to verify their identity
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[admin-update-user-role] Failed to get user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create admin client with service role key for privileged operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CRITICAL SECURITY CHECK: Verify the caller has admin role
    const { data: callerRole, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('[admin-update-user-role] Error fetching caller role:', roleError);
      return new Response(JSON.stringify({ error: 'Failed to verify permissions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (callerRole?.role !== 'admin') {
      console.warn(`[admin-update-user-role] Non-admin user ${user.id} attempted to update roles`);
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Prevent self-demotion for safety
    if (userId === user.id && role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Cannot change your own admin role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if the record exists
    const { data: existing, error: fetchError } = await adminSupabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await adminSupabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await adminSupabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      if (insertError) throw insertError;
    }

    // Log the admin action for audit trail
    await adminSupabase
      .from('admin_activity_logs')
      .insert({
        admin_id: user.id,
        action: 'update_user_role',
        entity_type: 'user',
        entity_id: userId,
        details: { new_role: role }
      });

    console.log(`[admin-update-user-role] Admin ${user.id} updated role for user ${userId} to ${role}`);

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
