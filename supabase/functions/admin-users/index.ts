import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[admin-users] Fetching all users for admin:', user.id);

    // Fetch all auth users using service role
    const { data: authData, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      console.error('[admin-users] Error listing users:', listError);
      throw listError;
    }

    const userIds = authData.users.map(u => u.id);
    console.log('[admin-users] Found auth users:', userIds.length);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('[admin-users] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Fetch user roles
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    if (rolesError) {
      console.error('[admin-users] Error fetching roles:', rolesError);
    }

    // Fetch user wallets
    const { data: userWallets, error: walletsError } = await supabaseClient
      .from('user_wallets')
      .select('user_id, balance, total_earned')
      .in('user_id', userIds);

    if (walletsError) {
      console.error('[admin-users] Error fetching wallets:', walletsError);
    }

    // Combine the data manually
    const combinedUsers = (profiles || []).map(profile => {
      const roleData = (userRoles || []).filter(r => r.user_id === profile.user_id);
      const walletData = (userWallets || []).filter(w => w.user_id === profile.user_id);
      
      return {
        ...profile,
        user_roles: roleData,
        user_wallets: walletData,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('[admin-users] Successfully fetched and combined user data:', combinedUsers.length);

    return new Response(JSON.stringify({ users: combinedUsers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[admin-users] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
